import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDataTable, AdminPageHeader, AdminTabBar } from "@/components/administration/AdminShell";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "System settings" };

export default async function SystemSettingsPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const settings = await db.systemSetting.findMany({
    orderBy: [{ module: "asc" }, { key: "asc" }],
    include: { updatedBy: { select: { email: true } } },
  });
  const modules = [...new Set(settings.map((setting) => setting.module))];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="System Settings"
        description="Central configuration for VAT, invoice numbering, currency, timezone, email, approvals, and company defaults."
      />
      <AdminTabBar />
      <div className="grid gap-6">
        {modules.map((module) => (
          <AdminDataTable key={module} title={module}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Updated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settings.filter((setting) => setting.module === module).map((setting) => (
                  <tr key={setting.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-950">{setting.key}</td>
                    <td className="px-4 py-3 text-slate-700">{setting.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{setting.sensitive ? "••••••" : setting.value}</td>
                    <td className="px-4 py-3 text-slate-500">{setting.valueType}</td>
                    <td className="px-4 py-3 text-slate-500">{setting.description ?? "No description"}</td>
                    <td className="px-4 py-3 text-slate-500">{setting.updatedBy?.email ?? "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminDataTable>
        ))}
      </div>
    </div>
  );
}
