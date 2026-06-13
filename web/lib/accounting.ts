import type { AccountType, Prisma, SourceType } from "@prisma/client";
import { db } from "@/lib/db";

export const defaultAccounts: Array<{
  code: string;
  description: string;
  name: string;
  systemKey: string;
  type: AccountType;
}> = [
  { code: "1000", description: "Cash on hand and petty cash.", name: "Cash", systemKey: "cash", type: "ASSET" },
  { code: "1010", description: "Operating bank account.", name: "Bank account", systemKey: "bank", type: "ASSET" },
  { code: "1100", description: "Customer balances from posted invoices.", name: "Accounts receivable", systemKey: "accounts_receivable", type: "ASSET" },
  { code: "1200", description: "Recoverable VAT on eligible purchases.", name: "Input VAT receivable", systemKey: "input_vat", type: "ASSET" },
  { code: "2000", description: "Supplier and bill balances.", name: "Accounts payable", systemKey: "accounts_payable", type: "LIABILITY" },
  { code: "2100", description: "VAT collected on sales invoices.", name: "Output VAT payable", systemKey: "output_vat", type: "LIABILITY" },
  { code: "3000", description: "Owner investment and retained earnings.", name: "Owner equity", systemKey: "owner_equity", type: "EQUITY" },
  { code: "4000", description: "Sales income from customer invoices.", name: "Sales revenue", systemKey: "sales_revenue", type: "INCOME" },
  { code: "5000", description: "General operating expenses.", name: "Operating expenses", systemKey: "operating_expenses", type: "EXPENSE" },
  { code: "5100", description: "Software, subscriptions, and cloud tools.", name: "Software and subscriptions", systemKey: "software_expense", type: "EXPENSE" },
  { code: "5200", description: "Rent, utilities, and office costs.", name: "Office and facilities", systemKey: "office_expense", type: "EXPENSE" },
  { code: "5300", description: "Professional fees and outsourced services.", name: "Professional fees", systemKey: "professional_fees", type: "EXPENSE" },
];

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

type AccountingTx = Prisma.TransactionClient;

type PostingLine = {
  accountKey: string;
  credit?: number;
  debit?: number;
  description?: string;
};

async function ensureDefaultAccounts(tx: AccountingTx, ownerId: string) {
  const accounts = await Promise.all(
    defaultAccounts.map((account) =>
      tx.account.upsert({
        where: {
          ownerId_systemKey: {
            ownerId,
            systemKey: account.systemKey,
          },
        },
        update: {
          description: account.description,
          name: account.name,
          status: "ACTIVE",
          type: account.type,
        },
        create: {
          code: account.code,
          description: account.description,
          name: account.name,
          ownerId,
          systemKey: account.systemKey,
          type: account.type,
        },
      }),
    ),
  );

  return new Map(accounts.map((account) => [account.systemKey, account]));
}

async function nextJournalNumber(tx: AccountingTx, ownerId: string) {
  const count = await tx.journalEntry.count({ where: { ownerId } });
  return `JE-${String(count + 1).padStart(6, "0")}`;
}

async function createBalancedJournalEntry(
  tx: AccountingTx,
  {
    entryDate,
    lines,
    memo,
    ownerId,
    sourceId,
    sourceType,
  }: {
    entryDate: Date;
    lines: PostingLine[];
    memo: string;
    ownerId: string;
    sourceId: string;
    sourceType: SourceType;
  },
) {
  const existing = await tx.journalEntry.findFirst({
    where: { ownerId, sourceId, sourceType, status: "POSTED" },
    select: { id: true },
  });
  if (existing) return existing;

  const accounts = await ensureDefaultAccounts(tx, ownerId);
  const normalized = lines
    .map((line) => ({
      ...line,
      credit: roundMoney(line.credit ?? 0),
      debit: roundMoney(line.debit ?? 0),
    }))
    .filter((line) => line.debit > 0 || line.credit > 0);
  const totalDebit = roundMoney(normalized.reduce((sum, line) => sum + line.debit, 0));
  const totalCredit = roundMoney(normalized.reduce((sum, line) => sum + line.credit, 0));

  if (totalDebit !== totalCredit) {
    throw new Error(`Journal entry is out of balance. Debit ${totalDebit}, credit ${totalCredit}.`);
  }

  return tx.journalEntry.create({
    data: {
      entryDate,
      entryNumber: await nextJournalNumber(tx, ownerId),
      memo,
      ownerId,
      sourceId,
      sourceType,
      status: "POSTED",
      lines: {
        create: normalized.map((line, index) => {
          const account = accounts.get(line.accountKey);
          if (!account) throw new Error(`Missing system account: ${line.accountKey}`);
          return {
            accountId: account.id,
            credit: line.credit,
            debit: line.debit,
            description: line.description ?? memo,
            sortOrder: index,
          };
        }),
      },
    },
    select: { id: true },
  });
}

export async function seedDefaultAccounts(ownerId: string) {
  const results = await db.$transaction(
    defaultAccounts.map((account) =>
      db.account.upsert({
        where: {
          ownerId_systemKey: {
            ownerId,
            systemKey: account.systemKey,
          },
        },
        update: {
          description: account.description,
          name: account.name,
          status: "ACTIVE",
          type: account.type,
        },
        create: {
          code: account.code,
          description: account.description,
          name: account.name,
          ownerId,
          systemKey: account.systemKey,
          type: account.type,
        },
      }),
    ),
  );

  return results;
}

export async function postInvoiceJournal(
  tx: AccountingTx,
  invoice: {
    id: string;
    invoiceNumber: string;
    issueDate: Date;
    ownerId: string;
    subtotal: Prisma.Decimal | number;
    total: Prisma.Decimal | number;
    vatTotal: Prisma.Decimal | number;
  },
) {
  return createBalancedJournalEntry(tx, {
    entryDate: invoice.issueDate,
    memo: `Posted invoice ${invoice.invoiceNumber}`,
    ownerId: invoice.ownerId,
    sourceId: invoice.id,
    sourceType: "INVOICE",
    lines: [
      { accountKey: "accounts_receivable", debit: toNumber(invoice.total), description: invoice.invoiceNumber },
      { accountKey: "sales_revenue", credit: toNumber(invoice.subtotal), description: invoice.invoiceNumber },
      { accountKey: "output_vat", credit: toNumber(invoice.vatTotal), description: invoice.invoiceNumber },
    ],
  });
}

export async function postPaymentJournal(
  tx: AccountingTx,
  payment: {
    amount: Prisma.Decimal | number;
    id: string;
    invoice: { invoiceNumber: string };
    ownerId: string;
    paymentDate: Date;
    reference: string | null;
  },
) {
  const reference = payment.reference || `Payment for ${payment.invoice.invoiceNumber}`;
  return createBalancedJournalEntry(tx, {
    entryDate: payment.paymentDate,
    memo: reference,
    ownerId: payment.ownerId,
    sourceId: payment.id,
    sourceType: "PAYMENT",
    lines: [
      { accountKey: "bank", debit: toNumber(payment.amount), description: reference },
      { accountKey: "accounts_receivable", credit: toNumber(payment.amount), description: reference },
    ],
  });
}

export async function postPaymentReversalJournal(
  tx: AccountingTx,
  payment: {
    amount: Prisma.Decimal | number;
    id: string;
    invoice: { invoiceNumber: string };
    ownerId: string;
    reference: string | null;
  },
) {
  const reference = payment.reference || `Deleted payment for ${payment.invoice.invoiceNumber}`;
  return createBalancedJournalEntry(tx, {
    entryDate: new Date(),
    memo: `Reversal: ${reference}`,
    ownerId: payment.ownerId,
    sourceId: `reversal:${payment.id}`,
    sourceType: "PAYMENT",
    lines: [
      { accountKey: "accounts_receivable", debit: toNumber(payment.amount), description: reference },
      { accountKey: "bank", credit: toNumber(payment.amount), description: reference },
    ],
  });
}

function expenseAccountKey(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("software") || normalized.includes("subscription")) return "software_expense";
  if (normalized.includes("rent") || normalized.includes("office") || normalized.includes("utilit")) return "office_expense";
  if (normalized.includes("professional") || normalized.includes("fee")) return "professional_fees";
  return "operating_expenses";
}

export async function postExpensePaymentJournal(
  tx: AccountingTx,
  expense: {
    amount: Prisma.Decimal | number;
    category: string;
    expenseDate: Date;
    id: string;
    ownerId: string;
    supplier: { name: string };
  },
) {
  const amount = toNumber(expense.amount);
  const vatAmount = roundMoney(amount * (5 / 105));
  const taxableAmount = roundMoney(amount - vatAmount);
  const memo = `Paid ${expense.category} expense to ${expense.supplier.name}`;

  return createBalancedJournalEntry(tx, {
    entryDate: expense.expenseDate,
    memo,
    ownerId: expense.ownerId,
    sourceId: expense.id,
    sourceType: "EXPENSE",
    lines: [
      { accountKey: expenseAccountKey(expense.category), debit: taxableAmount, description: memo },
      { accountKey: "input_vat", debit: vatAmount, description: memo },
      { accountKey: "bank", credit: amount, description: memo },
    ],
  });
}

export async function getAccountingOverview(ownerId: string) {
  const [accounts, journals] = await db.$transaction([
    db.account.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: [{ code: "asc" }],
      include: {
        journalLines: {
          select: { credit: true, debit: true },
        },
      },
    }),
    db.journalEntry.findMany({
      where: { ownerId },
      orderBy: { entryDate: "desc" },
      take: 50,
      include: {
        lines: {
          include: { account: { select: { code: true, name: true, type: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);

  return {
    accounts: accounts.map((account) => {
      const debit = account.journalLines.reduce((sum, line) => sum + toNumber(line.debit), 0);
      const credit = account.journalLines.reduce((sum, line) => sum + toNumber(line.credit), 0);
      const normalDebit = account.type === "ASSET" || account.type === "EXPENSE";
      return {
        code: account.code,
        description: account.description,
        id: account.id,
        name: account.name,
        status: account.status,
        systemKey: account.systemKey,
        type: account.type,
        balance: normalDebit ? debit - credit : credit - debit,
      };
    }),
    journals: journals.map((journal) => ({
      createdAt: journal.createdAt.toISOString(),
      entryDate: journal.entryDate.toISOString().slice(0, 10),
      entryNumber: journal.entryNumber,
      id: journal.id,
      memo: journal.memo,
      sourceId: journal.sourceId,
      sourceType: journal.sourceType,
      status: journal.status,
      totalCredit: journal.lines.reduce((sum, line) => sum + toNumber(line.credit), 0),
      totalDebit: journal.lines.reduce((sum, line) => sum + toNumber(line.debit), 0),
      lines: journal.lines.map((line) => ({
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        credit: toNumber(line.credit),
        debit: toNumber(line.debit),
        description: line.description,
        id: line.id,
      })),
    })),
  };
}
