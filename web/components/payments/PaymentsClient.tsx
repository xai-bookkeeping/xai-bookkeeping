"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Banknote, CreditCard, Landmark, Receipt, Search, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE";

type PaymentInvoice = {
  id: string;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  issueDate: string;
  status: string;
  customer: { id: string; name: string };
};

type Payment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  invoice: PaymentInvoice;
};

type InvoiceOption = PaymentInvoice;

type PaymentsResponse = {
  page: number;
  pageSize: number;
  total: number;
  payments: Payment[];
};

type PaymentDraft = {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  reference: string;
  notes: string;
};

const methods: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "BANK_TRANSFER", label: "Bank transfer", icon: Landmark },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "CHEQUE", label: "Cheque", icon: Receipt },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(invoiceId = "", amount = 0): PaymentDraft {
  return {
    invoiceId,
    amount,
    method: "BANK_TRANSFER",
    paymentDate: today(),
    reference: "",
    notes: "",
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

export function PaymentsClient({
  initialData,
  invoiceOptions,
}: {
  initialData: PaymentsResponse;
  invoiceOptions: InvoiceOption[];
}) {
  const firstInvoice = invoiceOptions.find((invoice) => invoice.outstandingAmount > 0) ?? invoiceOptions[0];
  const [data, setData] = useState(initialData);
  const [invoices, setInvoices] = useState(invoiceOptions);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<PaymentDraft>(
    emptyDraft(firstInvoice?.id ?? "", firstInvoice?.outstandingAmount ?? 0),
  );
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === draft.invoiceId),
    [draft.invoiceId, invoices],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(page));
    startTransition(async () => {
      try {
        const next = await requestJson<PaymentsResponse>(`/api/payments?${params.toString()}`);
        setData(next);
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to load payments." });
      }
    });
  }, [page, query]);

  function selectInvoice(invoiceId: string) {
    const invoice = invoices.find((item) => item.id === invoiceId);
    setDraft((current) => ({
      ...current,
      invoiceId,
      amount: invoice?.outstandingAmount ?? 0,
    }));
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await requestJson<{ payment: Payment }>("/api/payments", {
          method: "POST",
          body: JSON.stringify(draft),
        });
        setData((current) => ({
          ...current,
          total: current.total + 1,
          payments: [result.payment, ...current.payments].slice(0, current.pageSize),
        }));
        setInvoices((current) =>
          current.map((invoice) =>
            invoice.id === result.payment.invoice.id ? result.payment.invoice : invoice,
          ),
        );
        const nextOutstanding = result.payment.invoice.outstandingAmount;
        setDraft(emptyDraft(result.payment.invoice.id, nextOutstanding));
        setNotice({ type: "success", text: nextOutstanding <= 0 ? "Payment recorded. Invoice is paid." : "Payment recorded." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Payment failed." });
      }
    });
  }

  function deletePayment(payment: Payment) {
    if (!window.confirm(`Delete payment of ${money(payment.amount)}?`)) return;
    setNotice(null);
    startTransition(async () => {
      try {
        await requestJson<{ ok: true }>(`/api/payments/${payment.id}`, { method: "DELETE" });
        setData((current) => ({
          ...current,
          total: Math.max(0, current.total - 1),
          payments: current.payments.filter((item) => item.id !== payment.id),
        }));
        setNotice({ type: "success", text: "Payment deleted." });
      } catch (error) {
        setNotice({ type: "error", text: error instanceof Error ? error.message : "Delete failed." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">Cash collection</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Record partial or full customer payments against posted invoices.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm">
          <p className="text-2xl font-bold text-slate-950">{data.total}</p>
          <p className="text-xs font-medium text-slate-500">Payments recorded</p>
        </div>
      </div>

      {notice ? <Alert variant={notice.type === "success" ? "success" : "error"}>{notice.text}</Alert> : null}
      {invoiceOptions.length === 0 ? <Alert variant="error">Post an invoice before recording payments.</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <Input
              aria-label="Search payments"
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search invoice, customer, or reference"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Outstanding</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{money(payment.amount)}</p>
                      <p className="text-xs text-slate-500">{payment.reference || "No reference"}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{payment.invoice.invoiceNumber}</td>
                    <td className="px-4 py-4 text-slate-600">{payment.invoice.customer.name}</td>
                    <td className="px-4 py-4 text-slate-600">{payment.method.replaceAll("_", " ")}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-4 font-medium text-slate-900">{money(payment.invoice.outstandingAmount)}</td>
                    <td className="px-4 py-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => deletePayment(payment)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-sm text-slate-500">
                <Receipt className="h-8 w-8 text-slate-300" /> No payments found.
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

        <form onSubmit={submitPayment} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-slate-950">Record payment</h2>
            <p className="mt-1 text-sm text-slate-500">Payments reduce invoice outstanding balances automatically.</p>
          </div>

          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Invoice
            <select className="h-10 w-full rounded-xl border border-slate-200 px-3" value={draft.invoiceId} onChange={(event) => selectInvoice(event.target.value)}>
              <option value="">Select posted invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.customer.name} - {money(invoice.outstandingAmount)}
                </option>
              ))}
            </select>
          </label>

          {selectedInvoice ? (
            <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span>Total</span><strong>{money(selectedInvoice.total)}</strong></div>
              <div className="flex justify-between"><span>Paid</span><strong>{money(selectedInvoice.paidAmount)}</strong></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span>Outstanding</span><strong>{money(selectedInvoice.outstandingAmount)}</strong></div>
            </div>
          ) : null}

          <Input label="Amount" type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} />
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Method
            <div className="grid grid-cols-2 gap-2">
              {methods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, method: method.value })}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold",
                      draft.method === method.value
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="h-4 w-4" /> {method.label}
                  </button>
                );
              })}
            </div>
          </label>
          <Input label="Payment date" type="date" value={draft.paymentDate} onChange={(event) => setDraft({ ...draft, paymentDate: event.target.value })} />
          <Input label="Reference" value={draft.reference} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
            />
          </label>
          <Button type="submit" loading={isPending} disabled={!draft.invoiceId || invoiceOptions.length === 0} fullWidth>
            Record payment
          </Button>
        </form>
      </div>
    </div>
  );
}
