import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { expenseMutationSchema } from "@/lib/expense-validations";

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

export async function PATCH(request: NextRequest, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const existing = await db.expense.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
    select: { id: true, status: true, category: true, amount: true },
  });
  if (!existing) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft expenses can be edited." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = expenseMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const supplier = await db.supplier.findFirst({
    where: { id: parsed.data.supplierId, ownerId: session!.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

  const expense = await db.expense.update({
    where: { id },
    data: {
      supplierId: parsed.data.supplierId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      expenseDate: new Date(parsed.data.expenseDate),
      notes: parsed.data.notes || null,
      attachmentUrl: parsed.data.attachmentUrl || null,
    },
    include: { supplier: true },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "EXPENSE_UPDATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: {
      expenseId: id,
      before: { category: existing.category, amount: Number(existing.amount) },
      after: { category: expense.category, amount: Number(expense.amount) },
    },
  });

  return NextResponse.json({ expense: serializeExpense(expense) });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const existing = await db.expense.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
    select: { id: true, status: true, category: true, amount: true },
  });
  if (!existing) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft expenses can be deleted." }, { status: 400 });
  }

  await db.expense.update({ where: { id }, data: { deletedAt: new Date() } });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "EXPENSE_DELETED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { expenseId: id, category: existing.category, amount: Number(existing.amount) },
  });

  return NextResponse.json({ ok: true });
}
