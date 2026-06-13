import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { calculateInvoice } from "@/lib/invoice-calculations";
import { invoiceMutationSchema } from "@/lib/invoice-validations";

interface Props {
  params: Promise<{ id: string }>;
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

export async function PATCH(request: NextRequest, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const existing = await db.invoice.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
    select: { id: true, status: true, invoiceNumber: true },
  });
  if (!existing) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft invoices can be edited." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = invoiceMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, ownerId: session!.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const calculated = calculateInvoice(parsed.data.lines);

  const invoice = await db.$transaction(async (tx) => {
    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
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
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "INVOICE_UPDATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { invoiceId: id, invoiceNumber: existing.invoiceNumber, total: calculated.total },
  });

  return NextResponse.json({ invoice: serializeInvoice(invoice) });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const existing = await db.invoice.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
    select: { id: true, status: true, invoiceNumber: true },
  });
  if (!existing) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft invoices can be deleted." }, { status: 400 });
  }

  await db.invoice.update({ where: { id }, data: { deletedAt: new Date() } });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "INVOICE_DELETED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { invoiceId: id, invoiceNumber: existing.invoiceNumber },
  });

  return NextResponse.json({ ok: true });
}
