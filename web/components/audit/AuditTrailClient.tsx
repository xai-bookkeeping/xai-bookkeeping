"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  CalendarDays,
  Download,
  Filter,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type AuditRow = {
  action: string;
  createdAt: string;
  email: string | null;
  id: string;
  ip: string | null;
  metadata: unknown;
  userAgent: string | null;
};

type Summary = {
  business: number;
  security: number;
  total: number;
  uniqueActors: number;
  users: number;
};

type Category = "all" | "security" | "business" | "users";

interface AuditTrailClientProps {
  actions: string[];
  initialActivity: AuditRow[];
  initialSummary: Summary;
  initialTotal: number;
}

const categories: Array<{ id: Category; label: string }> = [
  { id: "all", label: "All events" },
  { id: "security", label: "Security" },
  { id: "business", label: "Business records" },
  { id: "users", label: "Users and profile" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function prettyAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataPreview(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "No metadata";
  const entries = Object.entries(metadata as Record<string, unknown>).filter(([, value]) => value !== null && value !== undefined);
  if (!entries.length) return "No metadata";
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function AuditTrailClient({
  actions,
  initialActivity,
  initialSummary,
  initialTotal,
}: AuditTrailClientProps) {
  const [activity, setActivity] = useState(initialActivity);
  const [summary, setSummary] = useState(initialSummary);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const actionOptions = useMemo(
    () => actions.map((item) => ({ label: prettyAction(item), value: item })),
    [actions],
  );

  function loadActivity(nextSkip = 0) {
    setError("");
    startTransition(async () => {
      const params = new URLSearchParams({
        category,
        skip: String(nextSkip),
        take: "100",
      });
      if (query.trim()) params.set("q", query.trim());
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(`/api/account/activity?${params.toString()}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Could not load audit events.");
        return;
      }
      setActivity(nextSkip > 0 ? (current) => [...current, ...body.activity] : body.activity);
      setSummary(body.summary);
      setTotal(body.total);
    });
  }

  function exportCsv() {
    const header = ["Timestamp", "Action", "Actor", "IP address", "User agent", "Metadata"];
    const rows = activity.map((item) => [
      formatDate(item.createdAt),
      prettyAction(item.action),
      item.email ?? "",
      item.ip ?? "",
      item.userAgent ?? "",
      metadataPreview(item.metadata),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `xai-books-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Audit trail
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Account and business activity
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review security, user, and finance events captured across XAI Books.
          </p>
        </div>
        <Button variant="secondary" onClick={exportCsv} disabled={activity.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total events", value: summary.total, icon: Activity, tone: "sky" },
          { label: "Security events", value: summary.security, icon: ShieldCheck, tone: "emerald" },
          { label: "Business events", value: summary.business, icon: CalendarDays, tone: "amber" },
          { label: "Unique actors", value: summary.uniqueActors, icon: UserRound, tone: "slate" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <section key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
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
              <p className="mt-4 text-3xl font-bold text-slate-950">{card.value}</p>
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Filters</h2>
              <p className="mt-1 text-sm text-slate-500">Search by actor, action, IP, device, or date range.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.9fr_1fr_0.7fr_0.7fr_auto]">
          <Input
            label="Search"
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Email, action, IP, browser"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Category
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Action
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="">Any action</option>
              {actionOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <div className="flex items-end">
            <Button loading={isPending} onClick={() => loadActivity()}>
              Apply
            </Button>
          </div>
        </div>
        {error ? <p className="px-5 pb-5 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Events</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {activity.length} of {total} matching events.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <MonitorSmartphone className="h-3.5 w-3.5" /> IP and device captured when available
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">IP address</th>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Metadata</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activity.map((item) => (
                <tr key={item.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-950">{prettyAction(item.action)}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.action}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{item.email ?? "System"}</td>
                  <td className="px-5 py-4 text-slate-600">{item.ip ?? "Unknown"}</td>
                  <td className="max-w-xs px-5 py-4 text-slate-600">
                    <span className="line-clamp-2">{item.userAgent ?? "Unknown device"}</span>
                  </td>
                  <td className="max-w-sm px-5 py-4 text-slate-600">
                    <span className="line-clamp-2">{metadataPreview(item.metadata)}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activity.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No audit events match these filters.</div>
        ) : null}

        {activity.length < total ? (
          <div className="border-t border-slate-100 p-5 text-center">
            <Button variant="secondary" loading={isPending} onClick={() => loadActivity(activity.length)}>
              Load more
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

