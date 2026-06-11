"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/cn";

type ShellCompany = {
  logoUrl: string | null;
  name: string;
  taxNumber: string | null;
};

type ShellUser = {
  avatarUrl: string | null;
  email: string;
  lastLoginAt: string | null;
  name: string;
  role: string;
};

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
};

type NavGroup = {
  items: NavItem[];
  label?: string;
};

const navGroups: NavGroup[] = [
  {
    items: [{ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { href: "/customers", icon: Users, label: "Customers" },
      { href: "/suppliers", icon: Building2, label: "Suppliers" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/invoices", icon: FileText, label: "Invoices" },
      { href: "/payments", icon: WalletCards, label: "Payments" },
      { href: "/expenses", icon: ReceiptText, label: "Expenses" },
      { href: "/accounting", icon: BookOpen, label: "Accounting" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/reports/vat", icon: FileBarChart, label: "Reports" },
      { href: "/audit", icon: ShieldCheck, label: "Audit Trail" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/users", icon: User, label: "Users" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "XB";
}

function roleLabel(role: string) {
  return role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CompanyMark({
  collapsed,
  company,
}: {
  collapsed: boolean;
  company: ShellCompany;
}) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      {company.logoUrl ? (
        <img src={company.logoUrl} alt="" className="h-11 w-11 rounded-xl border border-slate-200 bg-white object-contain p-1" />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 text-sm font-black text-white shadow-sm shadow-sky-500/20">
          {initials(company.name)}
        </div>
      )}
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{company.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">TRN: {company.taxNumber || "Not set"}</p>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({
  className,
  user,
}: {
  className?: string;
  user: ShellUser;
}) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <div className={cn("flex items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white", className)}>
      {initials(user.name)}
    </div>
  );
}

function SidebarContent({
  collapsed,
  company,
  onNavigate,
  onToggle,
  pathname,
  user,
}: {
  collapsed: boolean;
  company: ShellCompany;
  onNavigate?: () => void;
  onToggle?: () => void;
  pathname: string;
  user: ShellUser;
}) {
  const visibleGroups = useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.href !== "/users" || user.role === "ADMIN"),
      })).filter((group) => group.items.length > 0),
    [user.role],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <CompanyMark collapsed={collapsed} company={company} />
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label ?? `main-${groupIndex}`} className="space-y-1">
            {group.label && !collapsed ? (
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group.label}</p>
            ) : null}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none transition",
                    "focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    collapsed && "justify-center px-2",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-700")} />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className={cn("rounded-2xl bg-slate-50 p-3", collapsed && "p-2")}>
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <Avatar user={user} className="h-10 w-10 shrink-0" />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
                <p className="truncate text-xs font-medium text-slate-500">{roleLabel(user.role)}</p>
              </div>
            ) : null}
          </div>
          {!collapsed ? (
            <>
              <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-500 ring-1 ring-slate-200">
                <p className="font-semibold text-slate-700">Last login</p>
                <p className="mt-1">{formatDateTime(user.lastLoginAt)}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1">
                <Link href="/settings" className="rounded-lg px-2 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-950">
                  Profile
                </Link>
                <Link href="/settings" className="rounded-lg px-2 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-950">
                  Settings
                </Link>
                <form action={signOutAction}>
                  <button type="submit" className="w-full rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-950">
                    Logout
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  company,
  user,
}: {
  children: React.ReactNode;
  company: ShellCompany;
  user: ShellUser;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("xai.sidebar.collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem("xai.sidebar.collapsed", String(!current));
      return !current;
    });
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white shadow-sm transition-[width] duration-200 lg:block",
          collapsed ? "w-[84px]" : "w-[284px]",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          company={company}
          onToggle={toggleCollapsed}
          pathname={pathname}
          user={user}
        />
      </aside>

      <div className={cn("min-h-dvh transition-[padding] duration-200", collapsed ? "lg:pl-[84px]" : "lg:pl-[284px]")}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search invoices, customers, payments..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
                aria-label="Global search"
              />
            </div>
            <button type="button" className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 sm:inline-flex" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button type="button" className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 sm:inline-flex" aria-label="Help">
              <CircleHelp className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:bg-slate-50"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <Avatar user={user} className="h-8 w-8" />
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-32 truncate text-xs font-bold text-slate-950">{user.name}</p>
                  <p className="text-[11px] font-medium text-slate-500">{roleLabel(user.role)}</p>
                </div>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" role="menu">
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                    <Avatar user={user} className="h-11 w-11" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">{roleLabel(user.role)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 border-b border-slate-100 py-3 text-xs text-slate-500">
                    <div>
                      <p className="font-semibold text-slate-700">Last login</p>
                      <p className="mt-0.5">{formatDateTime(user.lastLoginAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Current session</p>
                      <p className="mt-0.5">Active in this browser</p>
                    </div>
                  </div>
                  <div className="grid gap-1 py-2 text-sm font-semibold text-slate-700">
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-slate-50" role="menuitem">
                      My Profile
                    </Link>
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-slate-50" role="menuitem">
                      Company Settings
                    </Link>
                    <Link href="/settings" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-slate-50" role="menuitem">
                      Security Settings
                    </Link>
                    <button type="button" className="rounded-xl px-3 py-2 text-left hover:bg-slate-50" role="menuitem">
                      Notifications
                    </button>
                  </div>
                  <form action={signOutAction} className="pt-2">
                    <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation backdrop"
          />
          <aside className="absolute inset-y-0 left-0 w-[310px] max-w-[86vw] bg-white shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              collapsed={false}
              company={company}
              onNavigate={() => setMobileOpen(false)}
              pathname={pathname}
              user={user}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

