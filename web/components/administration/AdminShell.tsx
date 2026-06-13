"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  Database,
  FilePenLine,
  KeyRound,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const adminModules = [
  { href: "/administration/users", icon: Users, label: "Users" },
  { href: "/administration/roles", icon: ShieldCheck, label: "Roles" },
  { href: "/administration/permissions", icon: KeyRound, label: "Permissions" },
  { href: "/administration/forms", icon: FilePenLine, label: "Form Fields" },
  { href: "/administration/reference-data", icon: Table2, label: "Reference Data" },
  { href: "/administration/system-settings", icon: Settings, label: "System Settings" },
  { href: "/administration/database", icon: Database, label: "Database Explorer" },
  { href: "/administration/audit", icon: Activity, label: "Audit Viewer" },
];

export function AdminPageHeader({
  eyebrow = "System Administration",
  title,
  description,
  action,
}: {
  action?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary-color,#0ea5e9)]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function AdminModuleGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {adminModules.map((module) => {
        const Icon = module.icon;
        return (
          <Link
            key={module.href}
            href={module.href}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
          >
            <Icon className="h-5 w-5 text-[var(--primary-color,#0ea5e9)]" />
            <p className="mt-3 font-semibold text-slate-950">{module.label}</p>
            <p className="mt-1 text-xs text-slate-500">Open administration screen</p>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminDataTable({
  children,
  title,
  description,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function AdminStat({
  label,
  value,
  helper,
}: {
  helper?: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function StatusPill({ active, label }: { active?: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide",
        active === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {label}
    </span>
  );
}

export function AdminTabBar() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {adminModules.map((module) => {
        const active = pathname === module.href;
        return (
          <Link
            key={module.href}
            href={module.href}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition",
              active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
            )}
          >
            {module.label}
          </Link>
        );
      })}
    </div>
  );
}
