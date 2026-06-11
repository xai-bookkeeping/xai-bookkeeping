import type { AccountType, Prisma } from "@prisma/client";
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

