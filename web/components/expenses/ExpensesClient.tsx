"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Paperclip, ReceiptText, Search, Trash2, WalletCards } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type ExpenseStatus = "DRAFT" | "APPROVED" | "PAID";

type SupplierOption = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  supplierId: string;
  supplier: SupplierOption;
  category: string;
  amount: number;
  expenseDate: string;
  notes: string | null;
  attachmentUrl: string | null;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
};

type ExpensesResponse = {
  expenses: Expense[];
  page: number;
  pageSize: number;
  total: number;
};

type ExpenseDraft = {
  supplierId: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes: string;
  attachmentUrl: string;
};

const statuses: ExpenseStatus[] = ["DRAFT", "APPROVED", "PAID"];
const defaultCategories = ["Office", "Travel", "Meals", "Software", "Rent", "Utilities", "Professional fees", "Other"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(supplierId = ""): ExpenseDraft {
  return {
    supplierId,
    category: "Office",
    amount: 0,
    expenseDate: today(),
    notes: "",
    attachmentUrl: "",
  };
}

function toDraft(expense: Expense): ExpenseDraft {
  return {
    supplierId: expense.supplierId,
    category: expense.category,
    amount: expense.amount,
    expenseDate: expense.expenseDate,
    notes: expense.notes ?? "",
    attachmentUrl: expense.attachmentUrl ?? "",
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(value));
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

export function ExpensesClient({
  initialData,
  role,
  suppliers,
}: {
  initialData: ExpensesResponse;
  role: string;
  suppliers: SupplierOption[];
}) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Expense | null>(initialData.expenses[0] ?? null);
  const [draft, setDraft] = useState<ExpenseDraft>(
    initialData.expenses[0] ? toDraft(initialData.expenses[0]) : emptyDraft(suppliers[0]?.id ?? ""),
  );
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const canApprove = role === "ADMIN" || role === "APPROVER";

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    params.set("page", String(page));

    startTransition(async () => {
      try {
        const next = await requestJson<ExpensesResponse>(`/api/expenses?${params.toString()}`);
        setData(next);
        setSelected((current) => {
          const resolved = current
            ? next.expenses.find((expense) => expense.id === current.id) ?? next.expenses[0] ?? null
            : next.expenses[0] ?? null;
          setDraft(resolved ? toDraft(resolved) : emptyDraft(suppliers[0]?.id ?? ""));
          return resolved;
        });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to load expenses." });
      }
    });
  }, [page, query, status, suppliers]);

  function selectExpense(expense: Expense) {
    setSelected(expense);
    setDraft(toDraft(expense));
  }

  function newExpense() {
    setSelected(null);
    setDraft(emptyDraft(suppliers[0]?.id ?? ""));
  }

  function saveExpense(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setNotice(null);
    const endpoint = selected ? `/api/expenses/${selected.id}` : "/api/expenses";
    const method = selected ? "PATCH" : "POST";
    startTransition(async () => {
      try {
        const result = await requestJson<{ expense: Expense }>(endpoint, {
          method,
          body: JSON.stringify(draft),
        });
        setData((current) => {
          const exists = current.expenses.some((expense) => expense.id === result.expense.id);
          return {
            ...current,
            total: exists ? current.total : current.total + 1,
            expenses: exists
              ? current.expenses.map((expense) => expense.id === result.expense.id ? result.expense : expense)
              : [result.expense, ...current.expenses].slice(0, current.pageSize),
          };
        });
        setSelected(result.expense);
        setDraft(toDraft(result.expense));
        setNotice({ type: "success", text: selected ? "Expense updated." : "Expense created." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Expense save failed." });
      }
    });
  }

  function deleteExpense() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.category} expense?`)) return;
    setNotice(null);
    startTransition(async () => {
      try {
        await requestJson<{ ok: true }>(`/api/expenses/${selected.id}`, { method: "DELETE" });
        setData((current) => {
          const expenses = current.expenses.filter((expense) => expense.id !== selected.id);
          const next = expenses[0] ?? null;
          setSelected(next);
          setDraft(next ? toDraft(next) : emptyDraft(suppliers[0]?.id ?? ""));
          return { ...current, total: Math.max(0, current.total - 1), expenses };
        });
        setNotice({ type: "success", text: "Expense deleted." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Delete failed." });
      }
    });
  }

  function statusAction(action: "approve" | "markPaid") {
    if (!selected) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ expense: Expense }>(`/api/expenses/${selected.id}/status`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        setSelected(result.expense);
        setData((current) => ({
          ...current,
          expenses: current.expenses.map((expense) => expense.id === result.expense.id ? result.expense : expense),
        }));
        setNotice({ type: "success", text: "Expense status updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Status update failed." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">Purchasing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Expenses</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track supplier expenses, approvals, payment status, and evidence links.
          </p>
        </div>
        <Button onClick={newExpense}><ReceiptText className="h-4 w-4" /> New expense</Button>
      </div>

      {notice ? <Alert variant={notice.type === "success" ? "success" : "error"}>{notice.text}</Alert> : null}
      {suppliers.length === 0 ? <Alert variant="error">Create a supplier before creating expenses.</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_170px]">
            <Input
              aria-label="Search expenses"
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search supplier, category, or notes"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Expense</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Attachment</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.expenses.map((expense) => (
                  <tr key={expense.id} onClick={() => selectExpense(expense)} className={cn("cursor-pointer hover:bg-slate-50", selected?.id === expense.id && "bg-sky-50/70")}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{expense.category}</p>
                      <p className="line-clamp-1 max-w-[240px] text-xs text-slate-500">{expense.notes || "No notes"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{expense.supplier.name}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{expense.status}</span></td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(expense.expenseDate)}</td>
                    <td className="px-4 py-4 text-slate-600">{expense.attachmentUrl ? "Linked" : "None"}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950">{money(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500">
                <WalletCards className="h-8 w-8 text-slate-300" /> No expenses found.
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1 || isPending} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages || isPending} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </section>

        <form onSubmit={saveExpense} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">{selected ? "Edit expense" : "New expense"}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected?.status ?? "DRAFT"}</p>
            </div>
            {selected?.status === "DRAFT" ? (
              <Button type="button" size="sm" variant="danger" onClick={deleteExpense}><Trash2 className="h-4 w-4" /> Delete</Button>
            ) : null}
          </div>

          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Supplier
            <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.supplierId} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => setDraft({ ...draft, supplierId: e.target.value })}>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Category
              <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.category} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {defaultCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <Input label="Amount" type="number" min="0" step="0.01" value={draft.amount} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} />
            <Input label="Date" type="date" value={draft.expenseDate} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => setDraft({ ...draft, expenseDate: e.target.value })} />
            <Input label="Attachment URL" leftIcon={<Paperclip className="h-4 w-4" />} value={draft.attachmentUrl} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => setDraft({ ...draft, attachmentUrl: e.target.value })} />
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea value={draft.notes} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15" />
          </label>

          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span>Expense amount</span><strong>{money(draft.amount || 0)}</strong></div>
          </div>

          <div className="grid gap-2">
            <Button type="submit" loading={isPending} disabled={suppliers.length === 0 || (selected?.status !== "DRAFT" && Boolean(selected))}>
              {selected ? "Save draft" : "Create draft"}
            </Button>
            {selected?.status === "DRAFT" && canApprove ? <Button type="button" variant="secondary" onClick={() => statusAction("approve")}><CheckCircle2 className="h-4 w-4" /> Approve</Button> : null}
            {selected?.status === "APPROVED" ? <Button type="button" variant="secondary" onClick={() => statusAction("markPaid")}>Mark paid</Button> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
