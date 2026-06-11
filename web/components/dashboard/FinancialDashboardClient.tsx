"use client";

import { ArrowDownRight, ArrowUpRight, Banknote, FileText, ReceiptText, WalletCards } from "lucide-react";
import { cn } from "@/lib/cn";

type Kpi = {
  label: string;
  value: string;
  helper: string;
  tone: "sky" | "emerald" | "amber" | "rose" | "slate";
};

type TrendPoint = {
  label: string;
  revenue: number;
  expenses: number;
  cash: number;
};

type StatusPoint = {
  label: string;
  value: number;
};

type ActivityItem = {
  action: string;
  createdAt: string;
  email: string | null;
};

type DashboardProps = {
  activity: ActivityItem[];
  cashFlow: TrendPoint[];
  expenseTrend: TrendPoint[];
  invoiceStatuses: StatusPoint[];
  kpis: Kpi[];
  revenueTrend: TrendPoint[];
};

const toneStyles = {
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

const icons = [FileText, ReceiptText, WalletCards, Banknote, ArrowUpRight];

function maxValue(points: TrendPoint[], key: keyof Pick<TrendPoint, "revenue" | "expenses" | "cash">) {
  return Math.max(1, ...points.map((point) => point[key]));
}

function money(value: number) {
  return new Intl.NumberFormat("en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function BarChart({
  color,
  data,
  field,
  title,
}: {
  color: string;
  data: TrendPoint[];
  field: keyof Pick<TrendPoint, "revenue" | "expenses" | "cash">;
  title: string;
}) {
  const max = maxValue(data, field);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-5 flex h-48 items-end gap-2">
        {data.map((point) => {
          const height = Math.max(6, (point[field] / max) * 100);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end rounded-lg bg-slate-50 px-1">
                <div
                  className={cn("w-full rounded-md", color)}
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${money(point[field])}`}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-500">{point.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusChart({ data }: { data: StatusPoint[] }) {
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">Invoice status</h2>
      <div className="mt-5 space-y-4">
        {data.map((item) => {
          const percent = (item.value / total) * 100;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="text-slate-500">{item.value}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-sky-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FinancialDashboardClient({
  activity,
  cashFlow,
  expenseTrend,
  invoiceStatuses,
  kpis,
  revenueTrend,
}: DashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi, index) => {
          const Icon = icons[index] ?? ArrowUpRight;
          return (
            <section key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={cn("rounded-lg p-2 ring-1", toneStyles[kpi.tone])}>
                  <Icon className="h-4 w-4" />
                </span>
                {index % 2 === 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{kpi.value}</p>
              <p className="mt-1 text-sm text-slate-500">{kpi.helper}</p>
            </section>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <BarChart color="bg-sky-500" data={revenueTrend} field="revenue" title="Revenue trend" />
        </div>
        <StatusChart data={invoiceStatuses} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BarChart color="bg-rose-500" data={expenseTrend} field="expenses" title="Expense trend" />
        <BarChart color="bg-emerald-500" data={cashFlow} field="cash" title="Cash received" />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-950">Recent activity</h2>
          <span className="text-xs font-medium text-slate-400">Live from audit log</span>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {activity.map((item) => (
            <div key={`${item.action}-${item.createdAt}`} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_220px_220px]">
              <span className="font-medium text-slate-800">{item.action.replaceAll("_", " ")}</span>
              <span className="text-slate-500">{item.email ?? "System"}</span>
              <span className="text-slate-500">{formatDate(item.createdAt)}</span>
            </div>
          ))}
          {activity.length === 0 ? <p className="py-6 text-sm text-slate-500">No activity yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
