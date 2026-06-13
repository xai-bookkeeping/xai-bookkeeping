import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDataTable, AdminPageHeader, AdminTabBar } from "@/components/administration/AdminShell";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Permission administration" };

export default async function AdminPermissionsPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const permissions = await db.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }],
    include: { roles: { include: { role: true } } },
  });
  const modules = [...new Set(permissions.map((permission) => permission.module))];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Permissions"
        description="Permission catalog grouped by module. These flags become the security contract for admin, finance, SQL, and audit actions."
      />
      <AdminTabBar />
      <div className="grid gap-6">
        {modules.map((module) => (
          <AdminDataTable key={module} title={module} description={`${module} permissions and assigned roles.`}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Permission</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Assigned Roles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.filter((permission) => permission.module === module).map((permission) => (
                  <tr key={permission.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-950">{permission.key}</td>
                    <td className="px-4 py-3 text-slate-700">{permission.action}</td>
                    <td className="px-4 py-3 text-slate-500">{permission.description ?? "No description"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {permission.roles.map((item) => (
                          <span key={item.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {item.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
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
