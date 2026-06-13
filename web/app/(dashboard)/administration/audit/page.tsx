import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDataTable, AdminPageHeader, AdminTabBar } from "@/components/administration/AdminShell";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Audit viewer" };

type Props = {
  searchParams: Promise<{ action?: string; user?: string }>;
};

function moduleFromAction(action: string) {
  return action.split("_")[0] ?? "SYSTEM";
}

export default async function AuditViewerPage({ searchParams }: Props) {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();
  const { action = "", user = "" } = await searchParams;
  const where = {
    ...(action ? { action: action as never } : {}),
    ...(user ? { email: { contains: user, mode: "insensitive" as const } } : {}),
  };

  const events = await db.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Viewer"
        description="Compliance-oriented audit view for administrative, security, finance, SQL, and reference-data activity."
      />
      <AdminTabBar />
      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <input
          name="user"
          defaultValue={user}
          placeholder="Filter user/email"
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
        />
        <input
          name="action"
          defaultValue={action}
          placeholder="Filter action, e.g. LOGIN_SUCCEEDED"
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
        />
        <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Apply</button>
      </form>
      <AdminDataTable title="Audit records" description="Latest 250 matching events. Old/new values are stored in metadata when available.">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Old / New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => {
              const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
              return (
                <tr key={event.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-500">{event.createdAt.toLocaleString("en-AE", { timeZone: "Asia/Dubai" })}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{event.email ?? "System"}</td>
                  <td className="px-4 py-3 text-slate-600">{moduleFromAction(event.action)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-950">{event.action}</td>
                  <td className="px-4 py-3 text-slate-500">{event.ip ?? "unknown"}</td>
                  <td className="px-4 py-3">
                    <pre className="max-w-xl overflow-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                      {JSON.stringify({ old: metadata.before ?? null, new: metadata.after ?? metadata }, null, 2)}
                    </pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminDataTable>
    </div>
  );
}
