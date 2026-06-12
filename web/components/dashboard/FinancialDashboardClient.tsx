"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/cn";

type TrendPoint = {
  cash: number;
  expenses: number;
  label: string;
  revenue: number;
};

type StatusPoint = {
  label: string;
  value: number;
};

type ActivityItem = {
  action: string;
  createdAt: string;
  email: string | null;
  metadata: unknown;
};

type PendingItem = {
  amount: number;
  date: string;
  id: string;
  label: string;
  party: string;
};

type RecentItem = {
  amount?: number;
  date: string;
  id: string;
  meta: string;
  status?: string;
  title: string;
};

type DashboardProps = {
  activity: ActivityItem[];
  company: {
    currency: string;
    logoUrl: string | null;
    name: string;
    taxNumber: string | null;
  };
  invoiceStatuses: StatusPoint[];
  kpis: {
    cashReceived: number;
    expenses: number;
    netProfit: number;
    outstanding: number;
    revenue: number;
    vatDue: number;
  };
  pending: {
    expenses: PendingItem[];
    invoices: PendingItem[];
    payments: PendingItem[];
  };
  recent: {
    customers: RecentItem[];
    expenses: RecentItem[];
    invoices: RecentItem[];
    payments: RecentItem[];
  };
  trend: TrendPoint[];
  user: {
    firstName: string;
    role: string;
  };
};

const quickActions = [
  { href: "/invoices", icon: FilePlus2, label: "Create Invoice" },
  { href: "/payments", icon: WalletCards, label: "Record Payment" },
  { href: "/expenses", icon: ReceiptText, label: "Add Expense" },
  { href: "/customers", icon: UserPlus, label: "Add Customer" },
  { href: "/suppliers", icon: Building2, label: "Add Supplier" },
];

function money(value: number, currency = "AED") {
  return new Intl.NumberFormat("en-AE", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-AE", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

function currentDubaiTime() {
  return new Intl.DateTimeFormat("en-AE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
    timeZoneName: "short",
  }).format(new Date());
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-AE", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Dubai",
  }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function roleLabel(role: string) {
  return role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function prettyAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataSubject(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  const data = metadata as Record<string, unknown>;
  return String(data.invoiceNumber ?? data.category ?? data.customerName ?? data.supplierName ?? "");
}

function EmptyState({
  action,
  href,
  text,
  title,
}: {
  action: string;
  href: string;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-800">
        {action} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function KpiCard({
  currency,
  helper,
  icon: Icon,
  label,
  tone,
  value,
}: {
  currency: string;
  helper: string;
  icon: typeof TrendingUp;
  label: string;
  tone: "green" | "red" | "orange" | "blue" | "purple" | "slate";
  value: number;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-slate-950">{money(value, currency)}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            tone === "green" && "bg-emerald-50 text-emerald-600",
            tone === "red" && "bg-rose-50 text-rose-600",
            tone === "orange" && "bg-amber-50 text-amber-600",
            tone === "blue" && "bg-sky-50 text-sky-600",
            tone === "purple" && "bg-violet-50 text-violet-600",
            tone === "slate" && "bg-slate-100 text-slate-600",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </section>
  );
}

function TrendChart({
  currency,
  data,
}: {
  currency: string;
  data: TrendPoint[];
}) {
  const max = Math.max(1, ...data.flatMap((point) => [point.revenue, point.expenses, point.cash]));
  const hasData = data.some((point) => point.revenue > 0 || point.expenses > 0 || point.cash > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Six-month movement</h2>
          <p className="mt-1 text-sm text-slate-500">Revenue, cash received, and approved expenses.</p>
        </div>
        <div className="hidden items-center gap-3 text-xs font-medium text-slate-500 sm:flex">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Cash</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Expenses</span>
        </div>
      </div>
      {hasData ? (
        <div className="mt-6 flex h-56 items-end gap-3">
          {data.map((point) => (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center gap-1 rounded-lg bg-slate-50 px-1.5">
                {[
                  ["bg-emerald-500", point.revenue],
                  ["bg-sky-500", point.cash],
                  ["bg-rose-500", point.expenses],
                ].map(([color, value]) => (
                  <div
                    key={`${point.label}-${color}`}
                    className={cn("w-full max-w-4 rounded-t", color as string)}
                    style={{ height: `${Math.max(4, (Number(value) / max) * 100)}%` }}
                    title={`${point.label}: ${money(Number(value), currency)}`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-slate-500">{point.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          action="Create invoice"
          href="/invoices"
          text="Create your first invoice and record payments to see financial movement here."
          title="No financial movement yet."
        />
      )}
    </section>
  );
}

function PendingList({
  currency,
  href,
  items,
  title,
}: {
  currency: string;
  href: string;
  items: PendingItem[];
  title: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{items.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.slice(0, 4).map((item) => (
          <Link key={item.id} href={href} className="block rounded-lg border border-slate-100 p-3 transition hover:border-amber-200 hover:bg-amber-50/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{item.party} | {formatDate(item.date)}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-slate-950">{money(item.amount, currency)}</p>
            </div>
          </Link>
        ))}
        {items.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Nothing waiting right now.</p>
        ) : null}
      </div>
    </div>
  );
}

function RecentList({
  currency,
  empty,
  href,
  items,
  title,
}: {
  currency: string;
  empty: { action: string; text: string; title: string };
  href: string;
  items: RecentItem[];
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-sky-700 hover:text-sky-800">View all</Link>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <Link key={item.id} href={href} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{item.meta} | {formatDate(item.date)}</p>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              {item.status ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{item.status}</span>
              ) : null}
              {typeof item.amount === "number" ? <span className="font-bold text-slate-950">{money(item.amount, currency)}</span> : null}
            </div>
          </Link>
        ))}
        {items.length === 0 ? (
          <EmptyState action={empty.action} href={href} text={empty.text} title={empty.title} />
        ) : null}
      </div>
    </section>
  );
}

function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950">Recent activity</h2>
        <Link href="/audit" className="text-sm font-semibold text-sky-700 hover:text-sky-800">Audit trail</Link>
      </div>
      <div className="mt-4 space-y-3">
        {activity.map((item) => {
          const subject = metadataSubject(item.metadata);
          return (
            <div key={`${item.action}-${item.createdAt}`} className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sky-600 ring-1 ring-slate-200">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {item.email ?? "System"} {prettyAction(item.action).toLowerCase()}
                  {subject ? ` ${subject}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
              </div>
            </div>
          );
        })}
        {activity.length === 0 ? (
          <EmptyState
            action="Create invoice"
            href="/invoices"
            text="Activity will appear when users create, approve, post, and update records."
            title="No activity yet."
          />
        ) : null}
      </div>
    </section>
  );
}

export function FinancialDashboardClient({
  activity,
  company,
  invoiceStatuses,
  kpis,
  pending,
  recent,
  trend,
  user,
}: DashboardProps) {
  const currency = company.currency || "AED";
  const totalPending = pending.invoices.length + pending.expenses.length + pending.payments.length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
          <div className="flex gap-4">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="" className="h-14 w-14 rounded-2xl border border-slate-200 object-contain p-1" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-sm font-black text-white">
                XB
              </div>
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">{greeting()}, {user.firstName}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Your finance workspace is ready.</h1>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                <div><span className="text-slate-400">Role</span><p className="font-semibold text-slate-900">{roleLabel(user.role)}</p></div>
                <div><span className="text-slate-400">Company</span><p className="font-semibold text-slate-900">{company.name}</p></div>
                <div><span className="text-slate-400">Current date</span><p className="font-semibold text-slate-900">{formatDate(new Date().toISOString())}</p></div>
                <div><span className="text-slate-400">Current time</span><p className="font-semibold text-slate-900">{currentDubaiTime()}</p></div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold text-slate-300">Work requiring attention</p>
            <p className="mt-3 text-4xl font-bold">{totalPending}</p>
            <p className="mt-2 text-sm text-slate-300">Submitted invoices, draft expenses, and outstanding posted invoices.</p>
            <Link href="/audit" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-200 hover:text-white">
              Review activity <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
            >
              <span className="flex items-center gap-3"><Icon className="h-4 w-4" /> {action.label}</span>
              <Plus className="h-4 w-4" />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard currency={currency} helper="Approved, posted, and paid invoices" icon={TrendingUp} label="Revenue" tone="green" value={kpis.revenue} />
        <KpiCard currency={currency} helper="Open posted invoice balance" icon={Clock3} label="Outstanding" tone="orange" value={kpis.outstanding} />
        <KpiCard currency={currency} helper="Recorded customer payments" icon={Banknote} label="Cash Received" tone="blue" value={kpis.cashReceived} />
        <KpiCard currency={currency} helper="Approved and paid expenses" icon={TrendingDown} label="Expenses" tone="red" value={kpis.expenses} />
        <KpiCard currency={currency} helper="Output VAT from invoices" icon={FileText} label="VAT Due" tone="slate" value={kpis.vatDue} />
        <KpiCard currency={currency} helper="Revenue less expenses" icon={TrendingUp} label="Net Profit" tone="purple" value={kpis.netProfit} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
        <TrendChart currency={currency} data={trend} />
        <ActivityFeed activity={activity} />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Pending approvals and follow-up</h2>
          <p className="mt-1 text-sm text-slate-500">Items that managers should clear before month-end work builds up.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <PendingList currency={currency} href="/invoices" items={pending.invoices} title="Pending invoices" />
          <PendingList currency={currency} href="/expenses" items={pending.expenses} title="Pending expenses" />
          <PendingList currency={currency} href="/payments" items={pending.payments} title="Pending payments" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentList currency={currency} empty={{ action: "Create invoice", text: "Create your first invoice to start tracking revenue.", title: "No invoices created yet." }} href="/invoices" items={recent.invoices} title="Recent invoices" />
        <RecentList currency={currency} empty={{ action: "Add customer", text: "Add a customer before creating invoices.", title: "No customers added yet." }} href="/customers" items={recent.customers} title="Recent customers" />
        <RecentList currency={currency} empty={{ action: "Add expense", text: "Capture supplier expenses to track spend and input VAT.", title: "No expenses recorded yet." }} href="/expenses" items={recent.expenses} title="Recent expenses" />
        <RecentList currency={currency} empty={{ action: "Record payment", text: "Post an invoice, then record a payment against it.", title: "No payments received yet." }} href="/payments" items={recent.payments} title="Recent payments" />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Invoice workflow</h2>
            <p className="mt-1 text-sm text-slate-500">Current status distribution across all invoices.</p>
          </div>
          <Link href="/invoices" className="text-sm font-semibold text-sky-700 hover:text-sky-800">Open invoices</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {invoiceStatuses.map((status) => (
            <div key={status.label} className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{status.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{status.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

