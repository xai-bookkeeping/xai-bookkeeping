import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FinancialDashboardClient } from "@/components/dashboard/FinancialDashboardClient";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

const MONTHS = 6;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-AE", { month: "short" }).format(date);
}

function buildMonths() {
  const now = new Date();
  return Array.from({ length: MONTHS }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - index), 1);
    return { key: monthKey(date), label: monthLabel(date) };
  });
}

function toNumber(value: { toString(): string } | number) {
  return typeof value === "number" ? value : Number(value.toString());
}

function serializeDate(date: Date) {
  return date.toISOString();
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  const ownerId = session.user.id;
  const months = buildMonths();
  const since = new Date();
  since.setMonth(since.getMonth() - (MONTHS - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [
    user,
    invoices,
    payments,
    expenses,
    invoiceStatusRows,
    activity,
    outstandingInvoices,
    pendingInvoices,
    pendingExpenses,
    recentInvoices,
    recentCustomers,
    recentExpenses,
    recentPayments,
  ] = await db.$transaction([
    db.user.findUnique({
      where: { id: ownerId },
      select: {
        company: { select: { currency: true, logoUrl: true, name: true, taxNumber: true } },
        companyName: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    }),
    db.invoice.findMany({
      where: { ownerId, deletedAt: null, issueDate: { gte: since } },
      select: { issueDate: true, status: true, total: true, vatTotal: true },
    }),
    db.payment.findMany({
      where: { ownerId, deletedAt: null, paymentDate: { gte: since } },
      select: { amount: true, paymentDate: true },
    }),
    db.expense.findMany({
      where: { ownerId, deletedAt: null, expenseDate: { gte: since } },
      select: { amount: true, expenseDate: true, status: true },
    }),
    db.invoice.findMany({
      where: { ownerId, deletedAt: null },
      select: { status: true },
    }),
    db.activityLog.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { action: true, createdAt: true, email: true, metadata: true },
    }),
    db.invoice.findMany({
      where: { ownerId, deletedAt: null, status: { in: ["POSTED"] } },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        dueDate: true,
        customer: { select: { name: true } },
        payments: { where: { deletedAt: null }, select: { amount: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    db.invoice.findMany({
      where: { ownerId, deletedAt: null, status: "SUBMITTED" },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        issueDate: true,
        customer: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.expense.findMany({
      where: { ownerId, deletedAt: null, status: "DRAFT" },
      select: {
        amount: true,
        category: true,
        expenseDate: true,
        id: true,
        supplier: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.invoice.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        issueDate: true,
        customer: { select: { name: true } },
      },
    }),
    db.customer.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { createdAt: true, email: true, id: true, name: true },
    }),
    db.expense.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        amount: true,
        category: true,
        expenseDate: true,
        id: true,
        status: true,
        supplier: { select: { name: true } },
      },
    }),
    db.payment.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        amount: true,
        id: true,
        method: true,
        paymentDate: true,
        invoice: {
          select: {
            invoiceNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const revenueByMonth = new Map(months.map((month) => [month.key, 0]));
  const vatByMonth = new Map(months.map((month) => [month.key, 0]));
  invoices
    .filter((invoice) => ["APPROVED", "POSTED", "PAID"].includes(invoice.status))
    .forEach((invoice) => {
      const key = monthKey(invoice.issueDate);
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + toNumber(invoice.total));
      vatByMonth.set(key, (vatByMonth.get(key) ?? 0) + toNumber(invoice.vatTotal));
    });

  const expensesByMonth = new Map(months.map((month) => [month.key, 0]));
  expenses
    .filter((expense) => ["APPROVED", "PAID"].includes(expense.status))
    .forEach((expense) => {
      const key = monthKey(expense.expenseDate);
      expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + toNumber(expense.amount));
    });

  const cashByMonth = new Map(months.map((month) => [month.key, 0]));
  payments.forEach((payment) => {
    const key = monthKey(payment.paymentDate);
    cashByMonth.set(key, (cashByMonth.get(key) ?? 0) + toNumber(payment.amount));
  });

  const revenueTotal = [...revenueByMonth.values()].reduce((sum, value) => sum + value, 0);
  const expenseTotal = [...expensesByMonth.values()].reduce((sum, value) => sum + value, 0);
  const cashTotal = [...cashByMonth.values()].reduce((sum, value) => sum + value, 0);
  const vatDue = [...vatByMonth.values()].reduce((sum, value) => sum + value, 0);
  const netProfit = revenueTotal - expenseTotal;
  const outstandingTotal = outstandingInvoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((paymentSum, payment) => paymentSum + toNumber(payment.amount), 0);
    return sum + Math.max(0, toNumber(invoice.total) - paid);
  }, 0);

  const invoiceStatusCounts = invoiceStatusRows.reduce<Map<string, number>>((counts, invoice) => {
    counts.set(invoice.status, (counts.get(invoice.status) ?? 0) + 1);
    return counts;
  }, new Map());

  const trend = months.map((month) => ({
    cash: Math.round(cashByMonth.get(month.key) ?? 0),
    expenses: Math.round(expensesByMonth.get(month.key) ?? 0),
    label: month.label,
    revenue: Math.round(revenueByMonth.get(month.key) ?? 0),
  }));

  return (
    <FinancialDashboardClient
      activity={activity.map((item) => ({
        action: item.action,
        createdAt: serializeDate(item.createdAt),
        email: item.email,
        metadata: item.metadata,
      }))}
      company={{
        currency: user?.company?.currency ?? "AED",
        logoUrl: user?.company?.logoUrl ?? null,
        name: user?.company?.name ?? user?.companyName ?? session.user.companyName ?? "XAI Books workspace",
        taxNumber: user?.company?.taxNumber ?? null,
      }}
      invoiceStatuses={["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "PAID"].map((status) => ({
        label: status,
        value: invoiceStatusCounts.get(status) ?? 0,
      }))}
      kpis={{
        cashReceived: cashTotal,
        expenses: expenseTotal,
        netProfit,
        outstanding: outstandingTotal,
        revenue: revenueTotal,
        vatDue,
      }}
      pending={{
        expenses: pendingExpenses.map((expense) => ({
          amount: toNumber(expense.amount),
          date: expense.expenseDate.toISOString(),
          id: expense.id,
          label: expense.category,
          party: expense.supplier.name,
        })),
        invoices: pendingInvoices.map((invoice) => ({
          amount: toNumber(invoice.total),
          date: invoice.issueDate.toISOString(),
          id: invoice.id,
          label: invoice.invoiceNumber,
          party: invoice.customer.name,
        })),
        payments: outstandingInvoices.map((invoice) => {
          const paid = invoice.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
          return {
            amount: Math.max(0, toNumber(invoice.total) - paid),
            date: invoice.dueDate?.toISOString() ?? "",
            id: invoice.id,
            label: invoice.invoiceNumber,
            party: invoice.customer.name,
          };
        }),
      }}
      recent={{
        customers: recentCustomers.map((customer) => ({
          date: customer.createdAt.toISOString(),
          id: customer.id,
          meta: customer.email ?? "No email",
          title: customer.name,
        })),
        expenses: recentExpenses.map((expense) => ({
          amount: toNumber(expense.amount),
          date: expense.expenseDate.toISOString(),
          id: expense.id,
          meta: expense.supplier.name,
          status: expense.status,
          title: expense.category,
        })),
        invoices: recentInvoices.map((invoice) => ({
          amount: toNumber(invoice.total),
          date: invoice.issueDate.toISOString(),
          id: invoice.id,
          meta: invoice.customer.name,
          status: invoice.status,
          title: invoice.invoiceNumber,
        })),
        payments: recentPayments.map((payment) => ({
          amount: toNumber(payment.amount),
          date: payment.paymentDate.toISOString(),
          id: payment.id,
          meta: `${payment.invoice.invoiceNumber} - ${payment.invoice.customer.name}`,
          status: payment.method,
          title: "Payment received",
        })),
      }}
      trend={trend}
      user={{
        firstName: user?.firstName ?? session.user.name.split(" ")[0] ?? "there",
        role: user?.role ?? session.user.role,
      }}
    />
  );
}
