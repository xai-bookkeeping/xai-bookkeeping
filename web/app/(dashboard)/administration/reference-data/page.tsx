import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDataTable, AdminPageHeader, AdminTabBar, StatusPill } from "@/components/administration/AdminShell";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Reference data" };

export default async function ReferenceDataPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const groups = await db.referenceDataGroup.findMany({
    orderBy: { name: "asc" },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reference Data"
        description="Configurable lookup tables for countries, currencies, departments, payment methods, expense categories, and tax codes."
      />
      <AdminTabBar />
      <div className="grid gap-6">
        {groups.map((group) => (
          <AdminDataTable key={group.id} title={group.name} description={group.description ?? group.key}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sort</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {group.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-950">{item.code}</td>
                    <td className="px-4 py-3 text-slate-700">{item.label}</td>
                    <td className="px-4 py-3"><StatusPill active={item.active} label={item.active ? "ACTIVE" : "INACTIVE"} /></td>
                    <td className="px-4 py-3 text-slate-500">{item.sortOrder}</td>
                    <td className="px-4 py-3 text-slate-500">{item.updatedAt.toLocaleString("en-AE", { timeZone: "Asia/Dubai" })}</td>
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
