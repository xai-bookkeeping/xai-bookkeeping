import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { postInvoiceJournal } from "@/lib/accounting";
import { canApproveRoutedDocument, findApprovalRoute, routeAssignment } from "@/lib/approval-routing";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { invoiceStatusActionSchema } from "@/lib/invoice-validations";
import { canPostFinanceRecords, canSubmitForApproval } from "@/lib/permissions";

interface Props {
  params: Promise<{ id: string }>;
}

const transitionMap = {
  submit: { from: "DRAFT", to: "SUBMITTED", audit: "INVOICE_SUBMITTED" },
  approve: { from: "SUBMITTED", to: "APPROVED", audit: "INVOICE_APPROVED" },
  post: { from: "APPROVED", to: "POSTED", audit: "INVOICE_POSTED" },
} as const;

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
    select: {
      approvalRouteId: true,
      assignedApproverId: true,
      id: true,
      invoiceNumber: true,
      ownerId: true,
      status: true,
      total: true,
    },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status !== transition.from) {
    return NextResponse.json(
      { error: `Invoice must be ${transition.from.toLowerCase()} before this action.` },
      { status: 400 },
    );
  }
  if (parsed.data.action === "submit" && !canSubmitForApproval(session!.user.role)) {
    return NextResponse.json({ error: "Only Admin or Accountant can submit invoices." }, { status: 403 });
  }
  if (parsed.data.action === "post" && !canPostFinanceRecords(session!.user.role)) {
    return NextResponse.json({ error: "Only Admin or Accountant can post invoices." }, { status: 403 });
  }
  if (parsed.data.action === "approve") {
    const route = invoice.approvalRouteId
      ? await db.approvalRoute.findFirst({
          where: { id: invoice.approvalRouteId, ownerId: session!.user.id },
        })
      : null;
    const allowed = canApproveRoutedDocument({
      assignedApproverId: invoice.assignedApproverId,
      currentUserId: session!.user.id,
      currentUserRole: session!.user.role,
      route,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not assigned to approve this invoice." },
        { status: 403 },
      );
    }
  }

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const route =
      parsed.data.action === "submit"
        ? await findApprovalRoute({
            amount: Number(invoice.total),
            documentType: "INVOICE",
            ownerId: session!.user.id,
            tx,
          })
        : null;
    const invoiceUpdate = await tx.invoice.update({
      where: { id },
      data: {
        status: transition.to,
        ...(parsed.data.action === "submit" ? { submittedAt: now, ...routeAssignment(route) } : {}),
        ...(parsed.data.action === "approve" ? { approvedAt: now, approvedById: session!.user.id } : {}),
        ...(parsed.data.action === "post" ? { postedAt: now, postedById: session!.user.id } : {}),
      },
      include: { customer: true, lines: { orderBy: { sortOrder: "asc" } } },
    });

    if (parsed.data.action === "post") {
      await postInvoiceJournal(tx, invoiceUpdate);
    }

    return invoiceUpdate;
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

  if (parsed.data.action === "submit" && updated.approvalRouteId) {
    await logAuditEvent({
      action: "INVOICE_ASSIGNED_FOR_APPROVAL",
      email: session!.user.email,
      ip,
      userAgent,
      userId: session!.user.id,
      metadata: {
        assignedApproverId: updated.assignedApproverId,
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        routeId: updated.approvalRouteId,
      },
    });
  }

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
