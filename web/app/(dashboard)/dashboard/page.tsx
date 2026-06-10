import type { Metadata } from "next";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {session?.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {session?.user.companyName} · UAE SME Finance Dashboard
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "VAT Status", value: "Compliant", sub: "5% auto-applied", color: "emerald" },
          { label: "Currency", value: "AED", sub: "TRN-ready by default", color: "sky" },
          { label: "Audit Trail", value: "SOC 2", sub: "All changes logged", color: "violet" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-1 text-sm text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Authentication system active</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          You are signed in as <strong className="text-slate-700">{session?.user.email}</strong> with
          role <strong className="text-slate-700">{session?.user.role}</strong>. The full XAI Books
          finance workspace will be built on top of this authentication foundation.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "JWT session",
            "bcrypt password",
            "Email verification",
            "Rate limiting",
            "CSRF protected",
            "HTTP-only cookies",
          ].map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
