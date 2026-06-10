import type { Metadata } from "next";
import { auth } from "@/auth";
import { FinancialDashboardClient } from "@/components/dashboard/FinancialDashboardClient";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

const MONTHS = 6;

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

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

export default async function DashboardPage() {
  const session = await auth();
  const ownerId = session?.user.id ?? "";
  const months = buildMonths();
  const since = new Date();
  since.setMonth(since.getMonth() - (MONTHS - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [company, invoices, payments, expenses, invoiceStatusRows, activity] = await db.$transaction([
    db.company.findUnique({
      where: { ownerId },
      select: { currency: true, name: true },
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
      select: { action: true, createdAt: true, email: true },
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
  const invoiceStatusCounts = invoiceStatusRows.reduce<Map<string, number>>((counts, invoice) => {
    counts.set(invoice.status, (counts.get(invoice.status) ?? 0) + 1);
    return counts;
  }, new Map());
  const outstandingInvoices = await db.invoice.findMany({
    where: { ownerId, deletedAt: null, status: { in: ["POSTED"] } },
    select: { total: true, payments: { where: { deletedAt: null }, select: { amount: true } } },
  });
  const outstandingTotal = outstandingInvoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((paymentSum, payment) => paymentSum + toNumber(payment.amount), 0);
    return sum + Math.max(0, toNumber(invoice.total) - paid);
  }, 0);

  const trend = months.map((month) => ({
    label: month.label,
    revenue: Math.round(revenueByMonth.get(month.key) ?? 0),
    expenses: Math.round(expensesByMonth.get(month.key) ?? 0),
    cash: Math.round(cashByMonth.get(month.key) ?? 0),
  }));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
          {company?.name ?? session?.user.companyName ?? "XAI Books"} · {company?.currency ?? "AED"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Financial dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Revenue, expenses, cash collection, VAT, and invoice workflow visibility from live records.
        </p>
      </div>

      <FinancialDashboardClient
        activity={activity.map((item) => ({
          action: item.action,
          createdAt: item.createdAt.toISOString(),
          email: item.email,
        }))}
        cashFlow={trend}
        expenseTrend={trend}
        invoiceStatuses={["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "PAID"].map((status) => ({
          label: status,
          value: invoiceStatusCounts.get(status) ?? 0,
        }))}
        kpis={[
          { label: "Revenue", value: money(revenueTotal), helper: "Approved, posted, and paid invoices", tone: "sky" },
          { label: "Expenses", value: money(expenseTotal), helper: "Approved and paid expenses", tone: "rose" },
          { label: "Outstanding", value: money(outstandingTotal), helper: "Open posted invoice balance", tone: "amber" },
          { label: "Cash received", value: money(cashTotal), helper: "Recorded customer payments", tone: "emerald" },
          { label: "VAT due", value: money(vatDue), helper: "Output VAT from invoices", tone: "slate" },
        ]}
        revenueTrend={trend}
      />
    </div>
  );
}
