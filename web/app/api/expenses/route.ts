import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { expenseListQuerySchema, expenseMutationSchema } from "@/lib/expense-validations";

const PAGE_SIZE = 12;

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

export async function GET(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = expenseListQuerySchema.safeParse({
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
            { category: { contains: q, mode: "insensitive" as const } },
            { supplier: { name: { contains: q, mode: "insensitive" as const } } },
            { notes: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, expenses] = await db.$transaction([
    db.expense.count({ where }),
    db.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { supplier: true },
    }),
  ]);

  return NextResponse.json({
    expenses: expenses.map(serializeExpense),
    page,
    pageSize: PAGE_SIZE,
    total,
  });
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = expenseMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const supplier = await db.supplier.findFirst({
    where: { id: parsed.data.supplierId, ownerId: session!.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

  const expense = await db.expense.create({
    data: {
      ownerId: session!.user.id,
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
    action: "EXPENSE_CREATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { expenseId: expense.id, amount: Number(expense.amount), category: expense.category },
  });

  return NextResponse.json({ expense: serializeExpense(expense) }, { status: 201 });
}
