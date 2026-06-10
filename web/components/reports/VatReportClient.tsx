"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Download, FileSpreadsheet, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { VatReport, VatReportRow } from "@/lib/vat-report";

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    currency: "AED",
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(value));
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function rowLabel(row: VatReportRow) {
  return row.type === "sale" ? "Sales VAT" : "Purchase VAT";
}

export function VatReportClient({ initialReport }: { initialReport: VatReport }) {
  const [report, setReport] = useState(initialReport);
  const [from, setFrom] = useState(initialReport.from);
  const [to, setTo] = useState(initialReport.to);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function loadReport() {
    setError("");
    startTransition(async () => {
      const params = new URLSearchParams({ from, to });
      const response = await fetch(`/api/reports/vat?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Could not load VAT report.");
        return;
      }
      setReport(body);
    });
  }

  function exportCsv() {
    const header = ["Date", "Type", "Reference", "Counterparty", "Status", "Taxable amount", "VAT amount", "Gross amount"];
    const rows = report.rows.map((row) => [
      row.date,
      rowLabel(row),
      row.reference,
      row.counterparty,
      row.status,
      row.taxableAmount,
      row.vatAmount,
      row.amount,
    ]);
    const summary = [
      [],
      ["Summary", "", "", "", "", "", "", ""],
      ["Output VAT", "", "", "", "", "", report.salesVat, report.totalSales],
      ["Input VAT", "", "", "", "", "", report.purchaseVat, report.totalPurchases],
      [report.netVat >= 0 ? "VAT payable" : "VAT reclaimable", "", "", "", "", "", Math.abs(report.netVat), ""],
    ];
    const csv = [header, ...rows, ...summary].map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `xai-books-vat-${report.from}-to-${report.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const cards = [
    { label: "Output VAT", value: report.salesVat, helper: "Posted and paid sales invoices", icon: TrendingUp, tone: "sky" },
    { label: "Input VAT", value: report.purchaseVat, helper: "Approved and paid expenses", icon: TrendingDown, tone: "emerald" },
    {
      label: report.netVat >= 0 ? "VAT payable" : "VAT reclaimable",
      value: Math.abs(report.netVat),
      helper: report.netVat >= 0 ? "Output less input VAT" : "Input VAT exceeds output VAT",
      icon: ReceiptText,
      tone: report.netVat >= 0 ? "amber" : "emerald",
    },
    { label: "Source rows", value: report.rows.length, helper: "Invoices and expenses included", icon: FileSpreadsheet, tone: "slate" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Reports
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            UAE VAT summary
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review output VAT, input VAT, and the net VAT position with source-record drill-downs.
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={report.rows.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[220px_220px_auto_1fr] md:items-end">
          <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <Button loading={isPending} onClick={loadReport}>Apply</Button>
          <p className="text-sm text-slate-500 md:text-right">
            Current range: {formatDate(report.from)} to {formatDate(report.to)}
          </p>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <section key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {typeof card.value === "number" && card.label !== "Source rows" ? money(card.value) : card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    card.tone === "sky" && "bg-sky-50 text-sky-600",
                    card.tone === "emerald" && "bg-emerald-50 text-emerald-600",
                    card.tone === "amber" && "bg-amber-50 text-amber-600",
                    card.tone === "slate" && "bg-slate-100 text-slate-600",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">{card.helper}</p>
            </section>
          );
        })}
      </div>

      <Alert variant="success">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">VAT basis</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {report.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Alert>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Source records</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sales invoices and purchase expenses included in this VAT range.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Net VAT: {money(report.netVat)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Counterparty</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Taxable</th>
                <th className="px-5 py-3 text-right">VAT</th>
                <th className="px-5 py-3 text-right">Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 text-slate-600">{formatDate(row.date)}</td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      row.type === "sale" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700",
                    )}>
                      {rowLabel(row)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-950">{row.reference}</td>
                  <td className="px-5 py-4 text-slate-700">{row.counterparty}</td>
                  <td className="px-5 py-4 text-slate-500">{row.status}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{money(row.taxableAmount)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">{money(row.vatAmount)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No posted sales invoices or approved expenses found for this period.
          </div>
        ) : null}
      </section>
    </div>
  );
}

