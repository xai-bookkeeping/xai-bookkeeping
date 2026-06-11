"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpenCheck, Coins, FileText, Landmark, PlusCircle, Scale } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Account = {
  balance: number;
  code: string;
  description: string | null;
  id: string;
  name: string;
  status: string;
  systemKey: string | null;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
};

type Journal = {
  entryDate: string;
  entryNumber: string;
  id: string;
  memo: string | null;
  sourceType: string;
  status: string;
  totalCredit: number;
  totalDebit: number;
  lines: Array<{
    accountCode: string;
    accountName: string;
    credit: number;
    debit: number;
    id: string;
  }>;
};

type Overview = {
  accounts: Account[];
  journals: Journal[];
};

const accountTypes: Account["type"][] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    currency: "AED",
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(value));
}

function typeLabel(type: string) {
  return type.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function typeTone(type: Account["type"]) {
  return {
    ASSET: "bg-sky-50 text-sky-700",
    EQUITY: "bg-violet-50 text-violet-700",
    EXPENSE: "bg-rose-50 text-rose-700",
    INCOME: "bg-emerald-50 text-emerald-700",
    LIABILITY: "bg-amber-50 text-amber-700",
  }[type];
}

export function AccountingClient({ initialOverview }: { initialOverview: Overview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const totals = useMemo(
    () =>
      accountTypes.map((type) => ({
        balance: overview.accounts
          .filter((account) => account.type === type)
          .reduce((sum, account) => sum + account.balance, 0),
        type,
      })),
    [overview.accounts],
  );

  function seedAccounts() {
    setError("");
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/accounting", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Could not set up default accounts.");
        return;
      }
      setOverview(body);
      setNotice("Default UAE SME chart of accounts is ready.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Accounting
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Chart of accounts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Keep the owner-friendly finance screens connected to a controlled accounting foundation.
          </p>
        </div>
        <Button onClick={seedAccounts} loading={isPending}>
          <PlusCircle className="h-4 w-4" /> Set up default accounts
        </Button>
      </div>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {totals.map((item) => (
          <section key={item.type} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{typeLabel(item.type)}</p>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", typeTone(item.type))}>
                {item.type === "ASSET" ? <Landmark className="h-4 w-4" /> : null}
                {item.type === "LIABILITY" ? <Scale className="h-4 w-4" /> : null}
                {item.type === "EQUITY" ? <Coins className="h-4 w-4" /> : null}
                {item.type === "INCOME" ? <BookOpenCheck className="h-4 w-4" /> : null}
                {item.type === "EXPENSE" ? <FileText className="h-4 w-4" /> : null}
              </div>
            </div>
            <p className="mt-4 text-xl font-bold text-slate-950">{money(item.balance)}</p>
          </section>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-950">Accounts</h2>
          <p className="mt-1 text-sm text-slate-500">Controlled default accounts for UAE SME finance workflows.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.accounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-mono text-slate-600">{account.code}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{account.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{account.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", typeTone(account.type))}>
                      {typeLabel(account.type)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{account.status}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">{money(account.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {overview.accounts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-slate-900">No accounts yet</p>
            <p className="mt-1 text-sm text-slate-500">Set up the default UAE SME chart of accounts to begin posting ledger entries.</p>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-950">Journal entries</h2>
          <p className="mt-1 text-sm text-slate-500">Balanced ledger entries will appear here as posting rules are enabled.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {overview.journals.map((journal) => (
            <div key={journal.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{journal.entryNumber}</p>
                  <p className="text-sm text-slate-500">{formatDate(journal.entryDate)} | {journal.sourceType} | {journal.status}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-slate-950">{money(journal.totalDebit)}</p>
                  <p className={cn("text-xs font-medium", journal.totalDebit === journal.totalCredit ? "text-emerald-600" : "text-red-600")}>
                    {journal.totalDebit === journal.totalCredit ? "Balanced" : "Out of balance"}
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
                <table className="min-w-[680px] w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journal.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-3 py-2">{line.accountCode} - {line.accountName}</td>
                        <td className="px-3 py-2 text-right">{line.debit ? money(line.debit) : "-"}</td>
                        <td className="px-3 py-2 text-right">{line.credit ? money(line.credit) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        {overview.journals.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No journal entries yet. The next accounting stage will post invoices, payments, and expenses into this ledger.
          </div>
        ) : null}
      </section>
    </div>
  );
}

