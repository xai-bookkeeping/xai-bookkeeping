"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileBarChart,
  FilePenLine,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  User,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/cn";

type ShellCompany = {
  accentColor?: string | null;
  logoUrl: string | null;
  name: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
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
      { href: "/administration", icon: Settings, label: "Admin Home" },
      { href: "/administration/users", icon: User, label: "Users" },
      { href: "/administration/roles", icon: ShieldCheck, label: "Roles" },
      { href: "/administration/permissions", icon: SlidersHorizontal, label: "Permissions" },
      { href: "/administration/forms", icon: FilePenLine, label: "Form Fields" },
      { href: "/administration/reference-data", icon: Table2, label: "Reference Data" },
      { href: "/administration/system-settings", icon: Settings, label: "System Settings" },
      { href: "/administration/database", icon: Table2, label: "Database Explorer" },
      { href: "/administration/audit", icon: ShieldCheck, label: "Audit Viewer" },
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

function currentPageLabel(pathname: string) {
  const allItems = navGroups.flatMap((group) => group.items);
  const active = allItems
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return active?.label ?? "Workspace";
}

function CompanyMark({
  collapsed,
  company,
}: {
  collapsed: boolean;
  company: ShellCompany;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
      {company.logoUrl ? (
        <img src={company.logoUrl} alt="" className="h-10 w-10 rounded-2xl border border-white/70 bg-white object-contain p-1 shadow-sm" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-sm font-black text-white shadow-sm shadow-sky-500/25">
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
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = user.avatarUrl?.trim();

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={cn("rounded-full object-cover", className)}
      />
    );
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
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.href !== "/users" || user.role === "ADMIN"),
        }))
        .filter((group) => group.items.length > 0),
    [user.role],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div className={cn(
          "flex items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-sm shadow-slate-200/60",
          collapsed && "justify-center rounded-2xl px-2",
        )}>
          <CompanyMark collapsed={collapsed} company={company} />
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="hidden rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-900 hover:shadow-sm lg:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Primary navigation">
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
                    "group flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-semibold outline-none transition",
                    "focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
                    active
                      ? "bg-[var(--secondary-color,#0f172a)] text-white shadow-sm shadow-slate-900/20"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950",
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

      <div className="p-3">
        <div className={cn("rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm", collapsed && "rounded-2xl p-2")}>
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
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-200/80">
                <p className="font-semibold text-slate-700">Last login</p>
                <p className="mt-1">{formatDateTime(user.lastLoginAt)}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1">
                <Link href="/settings" className="rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950">
                  Profile
                </Link>
                <Link href="/settings" className="rounded-xl px-2 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950">
                  Settings
                </Link>
                <form action={signOutAction}>
                  <button type="submit" className="w-full rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950">
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
  const { signOut } = useClerk();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutPending, startSignOutTransition] = useTransition();
  const pageLabel = currentPageLabel(pathname);
  const themeStyle = {
    "--primary-color": company.primaryColor || "#0ea5e9",
    "--secondary-color": company.secondaryColor || "#0f172a",
    "--accent-color": company.accentColor || "#22c55e",
  } as CSSProperties;

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

  function handleSignOut() {
    startSignOutTransition(async () => {
      await signOutAction();
      await signOut({ redirectUrl: "/login" });
    });
  }

  return (
    <div className="min-h-dvh bg-[#f7f8fb] text-slate-950" style={themeStyle}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200/80 bg-white/95 shadow-sm transition-[width] duration-200 lg:block",
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
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#f7f8fb]/85 backdrop-blur-xl">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-[150px] lg:block">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Workspace</p>
              <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-950">{pageLabel}</h1>
            </div>
            <div className="relative max-w-2xl flex-1">
              <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="search"
                placeholder="Search invoices, customers, payments..."
                className="h-11 w-full rounded-2xl border border-slate-200/90 bg-white pl-9 pr-20 text-sm shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
                aria-label="Global search"
              />
              <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400 sm:flex">
                Ctrl K
              </div>
            </div>
            <button type="button" className="relative hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
            </button>
            <button type="button" className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex" aria-label="Help">
              <CircleHelp className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <Avatar user={user} className="h-8 w-8" />
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-32 truncate text-sm font-bold leading-4 text-slate-950">{user.name}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{roleLabel(user.role)}</p>
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
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={signOutPending}
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
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
