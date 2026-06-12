import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { postExpensePaymentJournal } from "@/lib/accounting";
import { canApproveRoutedDocument, findApprovalRoute, routeAssignment } from "@/lib/approval-routing";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { expenseStatusActionSchema } from "@/lib/expense-validations";
import { canSubmitForApproval } from "@/lib/permissions";

interface Props {
  params: Promise<{ id: string }>;
}

function serializeExpense(expense: any) {
  return {
    ...expense,
    amount: Number(expense.amount),
    expenseDate: expense.expenseDate.toISOString().slice(0, 10),
    approvedAt: expense.approvedAt?.toISOString() ?? null,
    paidAt: expense.paidAt?.toISOString() ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    deletedAt: expense.deletedAt?.toISOString() ?? null,
  };
}

export async function POST(request: NextRequest, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = expenseStatusActionSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const expense = await db.expense.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
    select: {
      amount: true,
      approvalRouteId: true,
      assignedApproverId: true,
      category: true,
      id: true,
      ownerId: true,
      status: true,
    },
  });
  if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });

  if (parsed.data.action === "submit") {
    if (expense.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft expenses can be submitted." }, { status: 400 });
    }
    if (!canSubmitForApproval(session!.user.role)) {
      return NextResponse.json({ error: "Only Admin or Accountant can submit expenses." }, { status: 403 });
    }
  }

  if (parsed.data.action === "approve") {
    if (expense.status !== "SUBMITTED") {
      return NextResponse.json({ error: "Only submitted expenses can be approved." }, { status: 400 });
    }
    const route = expense.approvalRouteId
      ? await db.approvalRoute.findFirst({
          where: { id: expense.approvalRouteId, ownerId: session!.user.id },
        })
      : null;
    const allowed = canApproveRoutedDocument({
      assignedApproverId: expense.assignedApproverId,
      currentUserId: session!.user.id,
      currentUserRole: session!.user.role,
      route,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not assigned to approve this expense." },
        { status: 403 },
      );
    }
  }

  if (parsed.data.action === "markPaid" && expense.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved expenses can be marked paid." }, { status: 400 });
  }

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const route =
      parsed.data.action === "submit"
        ? await findApprovalRoute({
            amount: Number(expense.amount),
            documentType: "EXPENSE",
            ownerId: session!.user.id,
            tx,
          })
        : null;
    const expenseUpdate = await tx.expense.update({
      where: { id },
      data:
        parsed.data.action === "submit"
          ? { status: "SUBMITTED", submittedAt: now, ...routeAssignment(route) }
          : parsed.data.action === "approve"
            ? { status: "APPROVED", approvedAt: now, approvedById: session!.user.id }
            : { status: "PAID", paidAt: now },
      include: { supplier: true },
    });

    if (parsed.data.action === "markPaid") {
      await postExpensePaymentJournal(tx, expenseUpdate);
    }

    return expenseUpdate;
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action:
      parsed.data.action === "submit"
        ? "EXPENSE_SUBMITTED"
        : parsed.data.action === "approve"
          ? "EXPENSE_APPROVED"
          : "EXPENSE_PAID",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: {
      expenseId: id,
      category: expense.category,
      from: expense.status,
      to: updated.status,
    },
  });

  if (parsed.data.action === "submit" && updated.approvalRouteId) {
    await logAuditEvent({
      action: "EXPENSE_ASSIGNED_FOR_APPROVAL",
      email: session!.user.email,
      ip,
      userAgent,
      userId: session!.user.id,
      metadata: {
        assignedApproverId: updated.assignedApproverId,
        expenseId: id,
        routeId: updated.approvalRouteId,
      },
    });
  }

  return NextResponse.json({ expense: serializeExpense(updated) });
}
