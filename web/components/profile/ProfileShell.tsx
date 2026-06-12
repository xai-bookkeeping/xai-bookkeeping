import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, Clock3, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ProfileMetric = {
  label: string;
  value: string;
  helper?: string;
};

export type TimelineItem = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actor?: string | null;
  timestamp: string;
};

export function ProfileShell({
  actions,
  avatar,
  coverImageUrl,
  createdAt,
  metrics,
  name,
  status,
  subtitle,
  tabs,
  timeline,
  updatedAt,
}: {
  actions?: ReactNode;
  avatar: ReactNode;
  coverImageUrl?: string | null;
  createdAt: string;
  metrics: ProfileMetric[];
  name: string;
  status: string;
  subtitle?: string;
  tabs: Array<{ content: ReactNode; label: string }>;
  timeline: TimelineItem[];
  updatedAt: string;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative min-h-52">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--secondary-color,#0f172a),var(--primary-color,#0ea5e9),var(--accent-color,#22c55e))]" />
          )}
          <div className="absolute inset-0 bg-slate-950/35" />
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 items-end gap-4">
              <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-sm">
                {avatar}
              </div>
              <div className="min-w-0 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-3xl font-bold tracking-tight text-slate-950">{name}</h1>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                    {status}
                  </span>
                </div>
                {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
                <p className="mt-2 text-xs text-slate-400">
                  Created {createdAt} | Updated {updatedAt}
                </p>
              </div>
            </div>
            {actions ? <div className="pb-2">{actions}</div> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{metric.value}</p>
            {metric.helper ? <p className="mt-1 text-xs text-slate-500">{metric.helper}</p> : null}
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {tabs.map((tab) => (
            <section key={tab.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--primary-color,#0ea5e9)]" />
                <h2 className="font-semibold text-slate-950">{tab.label}</h2>
              </div>
              {tab.content}
            </section>
          ))}
        </div>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--primary-color,#0ea5e9)]" />
              <h2 className="font-semibold text-slate-950">Activity timeline</h2>
            </div>
            <Link href="/audit" className="text-sm font-semibold text-[var(--primary-color,#0ea5e9)]">Audit Trail</Link>
          </div>
          <Timeline items={timeline} />
        </section>
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No timeline events yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const Icon = item.icon ?? Clock3;
        return (
          <div key={`${item.title}-${item.timestamp}-${index}`} className="flex gap-3">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500", index === 0 && "bg-[var(--primary-color,#0ea5e9)] text-white")}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 border-b border-slate-100 pb-4">
              <p className="font-semibold text-slate-950">{item.title}</p>
              {item.description ? <p className="mt-1 text-sm text-slate-500">{item.description}</p> : null}
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                <Link2 className="h-3 w-3" />
                {item.actor ?? "System"} | {item.timestamp}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
