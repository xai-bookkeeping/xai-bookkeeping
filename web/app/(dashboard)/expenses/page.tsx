import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ExpensesClient } from "@/components/expenses/ExpensesClient";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Expenses" };

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

export default async function ExpensesPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const [suppliers, total, expenses] = await db.$transaction([
    db.supplier.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.expense.count({ where: { ownerId: session.user.id, deletedAt: null } }),
    db.expense.findMany({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { expenseDate: "desc" },
      take: PAGE_SIZE,
      include: { supplier: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <ExpensesClient
      initialData={{
        expenses: expenses.map(serializeExpense),
        page: 1,
        pageSize: PAGE_SIZE,
        total,
      }}
      role={session.user.role}
      suppliers={suppliers}
    />
  );
}
