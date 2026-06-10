import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { expenseStatusActionSchema } from "@/lib/expense-validations";

interface Props {
  params: Promise<{ id: string }>;
}

function canApprove(role: string) {
  return role === "ADMIN" || role === "APPROVER";
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
    select: { id: true, status: true, category: true },
  });
  if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });

  if (parsed.data.action === "approve") {
    if (expense.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft expenses can be approved." }, { status: 400 });
    }
    if (!canApprove(session!.user.role)) {
      return NextResponse.json({ error: "Only Admin or Approver can approve expenses." }, { status: 403 });
    }
  }

  if (parsed.data.action === "markPaid" && expense.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved expenses can be marked paid." }, { status: 400 });
  }

  const now = new Date();
  const updated = await db.expense.update({
    where: { id },
    data:
      parsed.data.action === "approve"
        ? { status: "APPROVED", approvedAt: now, approvedById: session!.user.id }
        : { status: "PAID", paidAt: now },
    include: { supplier: true },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: parsed.data.action === "approve" ? "EXPENSE_APPROVED" : "EXPENSE_PAID",
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

  return NextResponse.json({ expense: serializeExpense(updated) });
}
