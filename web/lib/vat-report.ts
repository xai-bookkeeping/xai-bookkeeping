import { db } from "@/lib/db";

const UAE_VAT_RATE = 5;

export type VatReportRow = {
  amount: number;
  counterparty: string;
  date: string;
  id: string;
  reference: string;
  status: string;
  taxableAmount: number;
  type: "sale" | "purchase";
  vatAmount: number;
};

export type VatReport = {
  assumptions: string[];
  from: string;
  netVat: number;
  purchaseVat: number;
  reclaimable: number;
  rows: VatReportRow[];
  salesVat: number;
  to: string;
  totalPurchases: number;
  totalSales: number;
  vatPayable: number;
};

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: { toString(): string } | number) {
  return typeof value === "number" ? value : Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function defaultVatRange(now = new Date()) {
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const from = new Date(now.getFullYear(), quarterStartMonth, 1);
  const to = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
  return { from: dateOnly(from), to: dateOnly(to) };
}

function parseReportDate(value: string, fallback: string, endOfDay = false) {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) return new Date(fallback);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

export async function getVatReport({
  from,
  ownerId,
  to,
}: {
  from?: string;
  ownerId: string;
  to?: string;
}): Promise<VatReport> {
  const defaults = defaultVatRange();
  const fromDate = parseReportDate(from ?? "", defaults.from);
  const toDate = parseReportDate(to ?? "", defaults.to, true);

  const [invoices, expenses] = await db.$transaction([
    db.invoice.findMany({
      where: {
        deletedAt: null,
        issueDate: { gte: fromDate, lte: toDate },
        ownerId,
        status: { in: ["POSTED", "PAID"] },
      },
      orderBy: { issueDate: "desc" },
      select: {
        customer: { select: { name: true, trn: true } },
        id: true,
        invoiceNumber: true,
        issueDate: true,
        status: true,
        subtotal: true,
        total: true,
        vatTotal: true,
      },
    }),
    db.expense.findMany({
      where: {
        deletedAt: null,
        expenseDate: { gte: fromDate, lte: toDate },
        ownerId,
        status: { in: ["APPROVED", "PAID"] },
      },
      orderBy: { expenseDate: "desc" },
      select: {
        amount: true,
        category: true,
        expenseDate: true,
        id: true,
        status: true,
        supplier: { select: { name: true, trn: true } },
      },
    }),
  ]);

  const salesRows: VatReportRow[] = invoices.map((invoice) => ({
    amount: toNumber(invoice.total),
    counterparty: invoice.customer.name,
    date: dateOnly(invoice.issueDate),
    id: invoice.id,
    reference: invoice.invoiceNumber,
    status: invoice.status,
    taxableAmount: toNumber(invoice.subtotal),
    type: "sale",
    vatAmount: toNumber(invoice.vatTotal),
  }));

  const purchaseRows: VatReportRow[] = expenses.map((expense) => {
    const amount = toNumber(expense.amount);
    const vatAmount = roundMoney(amount * (UAE_VAT_RATE / (100 + UAE_VAT_RATE)));
    return {
      amount,
      counterparty: expense.supplier.name,
      date: dateOnly(expense.expenseDate),
      id: expense.id,
      reference: expense.category,
      status: expense.status,
      taxableAmount: roundMoney(amount - vatAmount),
      type: "purchase",
      vatAmount,
    };
  });

  const rows = [...salesRows, ...purchaseRows].sort((a, b) => b.date.localeCompare(a.date));
  const salesVat = roundMoney(salesRows.reduce((sum, row) => sum + row.vatAmount, 0));
  const purchaseVat = roundMoney(purchaseRows.reduce((sum, row) => sum + row.vatAmount, 0));
  const totalSales = roundMoney(salesRows.reduce((sum, row) => sum + row.amount, 0));
  const totalPurchases = roundMoney(purchaseRows.reduce((sum, row) => sum + row.amount, 0));
  const netVat = roundMoney(salesVat - purchaseVat);

  return {
    assumptions: [
      "Sales VAT uses posted and paid invoice VAT totals.",
      "Purchase VAT uses approved and paid expenses.",
      "Until expense VAT fields exist, purchase VAT assumes the expense amount is VAT-inclusive at the UAE 5% rate.",
    ],
    from: dateOnly(fromDate),
    netVat,
    purchaseVat,
    reclaimable: netVat < 0 ? Math.abs(netVat) : 0,
    rows,
    salesVat,
    to: dateOnly(toDate),
    totalPurchases,
    totalSales,
    vatPayable: netVat > 0 ? netVat : 0,
  };
}

