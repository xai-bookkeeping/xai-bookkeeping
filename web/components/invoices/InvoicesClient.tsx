"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { FileText, Plus, Search, Send, ShieldCheck, Stamp, Trash2 } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type InvoiceStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "POSTED" | "PAID";

type CustomerOption = {
  id: string;
  name: string;
  email: string | null;
  trn: string | null;
};

type InvoiceLineDraft = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: CustomerOption;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  subtotal: number;
  vatTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  lines: Array<InvoiceLineDraft & { id: string; lineSubtotal: number; lineVat: number; lineTotal: number }>;
};

type InvoicesResponse = {
  invoices: Invoice[];
  page: number;
  pageSize: number;
  total: number;
};

type InvoiceDraft = {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lines: InvoiceLineDraft[];
};

const statuses: InvoiceStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "PAID"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(customerId = ""): InvoiceDraft {
  return {
    customerId,
    issueDate: today(),
    dueDate: "",
    notes: "",
    lines: [{ description: "", quantity: 1, unitPrice: 0, vatRate: 5 }],
  };
}

function toDraft(invoice: Invoice): InvoiceDraft {
  return {
    customerId: invoice.customerId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate ?? "",
    notes: invoice.notes ?? "",
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
    })),
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(value));
}

function calculate(lines: InvoiceLineDraft[]) {
  const rows = lines.map((line) => {
    const subtotal = Math.round(line.quantity * line.unitPrice * 100) / 100;
    const vat = Math.round(subtotal * (line.vatRate / 100) * 100) / 100;
    return { subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 };
  });
  const subtotal = rows.reduce((sum, line) => sum + line.subtotal, 0);
  const vat = rows.reduce((sum, line) => sum + line.vat, 0);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    total: Math.round((subtotal + vat) * 100) / 100,
  };
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

export function InvoicesClient({
  customers,
  initialData,
  role,
}: {
  customers: CustomerOption[];
  initialData: InvoicesResponse;
  role: string;
}) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(initialData.invoices[0] ?? null);
  const [draft, setDraft] = useState<InvoiceDraft>(
    initialData.invoices[0] ? toDraft(initialData.invoices[0]) : emptyDraft(customers[0]?.id ?? ""),
  );
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const totals = useMemo(() => calculate(draft.lines), [draft.lines]);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const canApprove = role === "ADMIN" || role === "APPROVER";

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    params.set("page", String(page));
    startTransition(async () => {
      try {
        const next = await requestJson<InvoicesResponse>(`/api/invoices?${params.toString()}`);
        setData(next);
        setSelected((current) => {
          const resolved = current
            ? next.invoices.find((invoice) => invoice.id === current.id) ?? next.invoices[0] ?? null
            : next.invoices[0] ?? null;
          setDraft(resolved ? toDraft(resolved) : emptyDraft(customers[0]?.id ?? ""));
          return resolved;
        });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to load invoices." });
      }
    });
  }, [customers, page, query, status]);

  function selectInvoice(invoice: Invoice) {
    setSelected(invoice);
    setDraft(toDraft(invoice));
  }

  function updateLine(index: number, patch: Partial<InvoiceLineDraft>) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line, itemIndex) => itemIndex === index ? { ...line, ...patch } : line),
    }));
  }

  function removeLine(index: number) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function newInvoice() {
    setSelected(null);
    setDraft(emptyDraft(customers[0]?.id ?? ""));
  }

  function saveInvoice(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setNotice(null);
    const endpoint = selected ? `/api/invoices/${selected.id}` : "/api/invoices";
    const method = selected ? "PATCH" : "POST";
    startTransition(async () => {
      try {
        const result = await requestJson<{ invoice: Invoice }>(endpoint, {
          method,
          body: JSON.stringify(draft),
        });
        setData((current) => {
          const exists = current.invoices.some((invoice) => invoice.id === result.invoice.id);
          return {
            ...current,
            total: exists ? current.total : current.total + 1,
            invoices: exists
              ? current.invoices.map((invoice) => invoice.id === result.invoice.id ? result.invoice : invoice)
              : [result.invoice, ...current.invoices].slice(0, current.pageSize),
          };
        });
        setSelected(result.invoice);
        setDraft(toDraft(result.invoice));
        setNotice({ type: "success", text: selected ? "Invoice updated." : "Invoice created." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Invoice save failed." });
      }
    });
  }

  function deleteInvoice() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.invoiceNumber}?`)) return;
    setNotice(null);
    startTransition(async () => {
      try {
        await requestJson<{ ok: true }>(`/api/invoices/${selected.id}`, { method: "DELETE" });
        setData((current) => {
          const invoices = current.invoices.filter((invoice) => invoice.id !== selected.id);
          const next = invoices[0] ?? null;
          setSelected(next);
          setDraft(next ? toDraft(next) : emptyDraft(customers[0]?.id ?? ""));
          return { ...current, total: Math.max(0, current.total - 1), invoices };
        });
        setNotice({ type: "success", text: "Invoice deleted." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Delete failed." });
      }
    });
  }

  function statusAction(action: "submit" | "approve" | "post") {
    if (!selected) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ invoice: Invoice }>(`/api/invoices/${selected.id}/status`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        setSelected(result.invoice);
        setData((current) => ({
          ...current,
          invoices: current.invoices.map((invoice) => invoice.id === result.invoice.id ? result.invoice : invoice),
        }));
        setNotice({ type: "success", text: "Invoice status updated." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Status update failed." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">Sales</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Invoices</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Create UAE VAT invoices, submit them for approval, and post approved invoices.
          </p>
        </div>
        <Button onClick={newInvoice}><Plus className="h-4 w-4" /> New invoice</Button>
      </div>

      {notice ? <Alert variant={notice.type === "success" ? "success" : "error"}>{notice.text}</Alert> : null}
      {customers.length === 0 ? <Alert variant="error">Create a customer before creating invoices.</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_170px]">
            <Input
              aria-label="Search invoices"
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search invoice or customer"
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
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Issue date</th>
                  <th className="px-4 py-3 font-semibold">VAT</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id} onClick={() => selectInvoice(invoice)} className={cn("cursor-pointer hover:bg-slate-50", selected?.id === invoice.id && "bg-sky-50/70")}>
                    <td className="px-4 py-4 font-semibold text-slate-950">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-4 text-slate-600">{invoice.customer.name}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{invoice.status}</span></td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(invoice.issueDate)}</td>
                    <td className="px-4 py-4 text-slate-600">{money(invoice.vatTotal)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950">{money(invoice.total)}</td>
                    <td className="px-4 py-4">
                      <Link href={`/invoices/${invoice.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-sky-700 hover:text-sky-800">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500">
                <FileText className="h-8 w-8 text-slate-300" /> No invoices found.
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

        <form onSubmit={saveInvoice} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">{selected ? selected.invoiceNumber : "New invoice"}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected?.status ?? "DRAFT"}</p>
            </div>
            {selected?.status === "DRAFT" ? (
              <Button type="button" size="sm" variant="danger" onClick={deleteInvoice}><Trash2 className="h-4 w-4" /> Delete</Button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
              Customer
              <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.customerId} onChange={(e) => setDraft({ ...draft, customerId: e.target.value })} disabled={selected?.status !== "DRAFT" && Boolean(selected)}>
                <option value="">Select customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <Input label="Issue date" type="date" value={draft.issueDate} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} />
            <Input label="Due date" type="date" value={draft.dueDate} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Line items</p>
              <Button type="button" size="sm" variant="secondary" disabled={selected?.status !== "DRAFT" && Boolean(selected)} onClick={() => setDraft({ ...draft, lines: [...draft.lines, { description: "", quantity: 1, unitPrice: 0, vatRate: 5 }] })}>
                Add line
              </Button>
            </div>
            {draft.lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3">
                <Input label="Description" value={line.description} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => updateLine(index, { description: e.target.value })} />
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input label="Qty" type="number" min="0" step="0.001" value={line.quantity} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} />
                  <Input label="Unit price" type="number" min="0" step="0.01" value={line.unitPrice} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} />
                  <Input label="VAT %" type="number" min="0" step="0.01" value={line.vatRate} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(e) => updateLine(index, { vatRate: Number(e.target.value) })} />
                  <Button type="button" variant="secondary" disabled={draft.lines.length === 1 || (selected?.status !== "DRAFT" && Boolean(selected))} onClick={() => removeLine(index)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea value={draft.notes} disabled={selected?.status !== "DRAFT" && Boolean(selected)} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15" />
          </label>

          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
            <div className="mt-2 flex justify-between"><span>VAT</span><strong>{money(totals.vat)}</strong></div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base"><span>Total</span><strong>{money(totals.total)}</strong></div>
          </div>

          <div className="grid gap-2">
            <Button type="submit" loading={isPending} disabled={customers.length === 0 || (selected?.status !== "DRAFT" && Boolean(selected))}>
              {selected ? "Save draft" : "Create draft"}
            </Button>
            {selected?.status === "DRAFT" ? <Button type="button" variant="secondary" onClick={() => statusAction("submit")}><Send className="h-4 w-4" /> Submit</Button> : null}
            {selected?.status === "SUBMITTED" && canApprove ? <Button type="button" variant="secondary" onClick={() => statusAction("approve")}><ShieldCheck className="h-4 w-4" /> Approve</Button> : null}
            {selected?.status === "APPROVED" ? <Button type="button" variant="secondary" onClick={() => statusAction("post")}><Stamp className="h-4 w-4" /> Post</Button> : null}
          </div>
        </form>
      </div>
    </div>
  );
}
