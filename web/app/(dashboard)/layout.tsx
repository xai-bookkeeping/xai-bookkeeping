import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOutAction } from "@/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");
  const { db } = await import("@/lib/db");
  const company = await db.company.findUnique({
    where: { ownerId: session.user.id },
    select: { logoUrl: true, name: true },
  });

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 select-none">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-xs font-black text-white">
                XB
              </div>
            )}
            <span className="text-base font-black tracking-tight text-slate-900">
              <span className="text-sky-500">X</span>AI Books
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{session.user.name}</p>
              <p className="text-xs text-slate-500">{company?.name ?? session.user.companyName}</p>
            </div>
            <Link
              href="/customers"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Customers
            </Link>
            <Link
              href="/invoices"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Invoices
            </Link>
            <Link
              href="/payments"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Payments
            </Link>
            <Link
              href="/suppliers"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Suppliers
            </Link>
            <Link
              href="/expenses"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Expenses
            </Link>
            <Link
              href="/reports/vat"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Reports
            </Link>
            <Link
              href="/accounting"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Accounting
            </Link>
            <Link
              href="/audit"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Audit
            </Link>
            <Link
              href="/settings"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Settings
            </Link>
            {session.user.role === "ADMIN" ? (
              <Link
                href="/users"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Users
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
