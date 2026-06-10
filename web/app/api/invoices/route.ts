import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { calculateInvoice } from "@/lib/invoice-calculations";
import { invoiceListQuerySchema, invoiceMutationSchema } from "@/lib/invoice-validations";

const PAGE_SIZE = 12;

async function nextInvoiceNumber(ownerId: string) {
  const count = await db.invoice.count({ where: { ownerId } });
  return `INV-${String(count + 1).padStart(5, "0")}`;
}

function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    vatTotal: Number(invoice.vatTotal),
    total: Number(invoice.total),
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
    approvedAt: invoice.approvedAt?.toISOString() ?? null,
    postedAt: invoice.postedAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    deletedAt: invoice.deletedAt?.toISOString() ?? null,
    lines: invoice.lines?.map((line: any) => ({
      ...line,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      vatRate: Number(line.vatRate),
      lineSubtotal: Number(line.lineSubtotal),
      lineVat: Number(line.lineVat),
      lineTotal: Number(line.lineTotal),
    })),
  };
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = invoiceListQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? 1,
  });
  if (!parsed.success) return validationError(parsed.error);

  const { q, status, page } = parsed.data;
  const where = {
    ownerId: session!.user.id,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { invoiceNumber: { contains: q, mode: "insensitive" as const } },
            { customer: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, invoices] = await db.$transaction([
    db.invoice.count({ where }),
    db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: true, lines: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return NextResponse.json({
    invoices: invoices.map(serializeInvoice),
    page,
    pageSize: PAGE_SIZE,
    total,
  });
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = invoiceMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, ownerId: session!.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const calculated = calculateInvoice(parsed.data.lines);
  const invoiceNumber = await nextInvoiceNumber(session!.user.id);

  const invoice = await db.invoice.create({
    data: {
      ownerId: session!.user.id,
      customerId: parsed.data.customerId,
      invoiceNumber,
      issueDate: new Date(parsed.data.issueDate),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes || null,
      subtotal: calculated.subtotal,
      vatTotal: calculated.vatTotal,
      total: calculated.total,
      lines: {
        create: calculated.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          lineSubtotal: line.lineSubtotal,
          lineVat: line.lineVat,
          lineTotal: line.lineTotal,
          sortOrder: line.sortOrder,
        })),
      },
    },
    include: { customer: true, lines: { orderBy: { sortOrder: "asc" } } },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "INVOICE_CREATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { invoiceId: invoice.id, invoiceNumber, total: calculated.total },
  });

  return NextResponse.json({ invoice: serializeInvoice(invoice) }, { status: 201 });
}
