import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { invoiceStatusActionSchema } from "@/lib/invoice-validations";

interface Props {
  params: Promise<{ id: string }>;
}

const transitionMap = {
  submit: { from: "DRAFT", to: "SUBMITTED", audit: "INVOICE_SUBMITTED" },
  approve: { from: "SUBMITTED", to: "APPROVED", audit: "INVOICE_APPROVED" },
  post: { from: "APPROVED", to: "POSTED", audit: "INVOICE_POSTED" },
} as const;

function canApprove(role: string) {
  return role === "ADMIN" || role === "APPROVER";
}

export async function POST(request: NextRequest, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = invoiceStatusActionSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const transition = transitionMap[parsed.data.action];
  const invoice = await db.invoice.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
    select: { id: true, status: true, invoiceNumber: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status !== transition.from) {
    return NextResponse.json(
      { error: `Invoice must be ${transition.from.toLowerCase()} before this action.` },
      { status: 400 },
    );
  }
  if (parsed.data.action === "approve" && !canApprove(session!.user.role)) {
    return NextResponse.json({ error: "Only Admin or Approver can approve invoices." }, { status: 403 });
  }

  const now = new Date();
  const updated = await db.invoice.update({
    where: { id },
    data: {
      status: transition.to,
      ...(parsed.data.action === "approve" ? { approvedAt: now, approvedById: session!.user.id } : {}),
      ...(parsed.data.action === "post" ? { postedAt: now, postedById: session!.user.id } : {}),
    },
    include: { customer: true, lines: { orderBy: { sortOrder: "asc" } } },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: transition.audit,
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      from: invoice.status,
      to: transition.to,
    },
  });

  return NextResponse.json({
    invoice: {
      ...updated,
      subtotal: Number(updated.subtotal),
      vatTotal: Number(updated.vatTotal),
      total: Number(updated.total),
      issueDate: updated.issueDate.toISOString().slice(0, 10),
      dueDate: updated.dueDate?.toISOString().slice(0, 10) ?? null,
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      postedAt: updated.postedAt?.toISOString() ?? null,
      paidAt: updated.paidAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      deletedAt: updated.deletedAt?.toISOString() ?? null,
      lines: updated.lines.map((line) => ({
        ...line,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        vatRate: Number(line.vatRate),
        lineSubtotal: Number(line.lineSubtotal),
        lineVat: Number(line.lineVat),
        lineTotal: Number(line.lineTotal),
      })),
    },
  });
}
