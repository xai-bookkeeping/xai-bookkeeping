import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDataTable, AdminModuleGrid, AdminPageHeader, AdminStat } from "@/components/administration/AdminShell";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Administration" };

export default async function AdministrationPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const [users, roles, permissions, referenceGroups, settings, auditEvents] = await db.$transaction([
    db.user.count(),
    db.adminRole.count(),
    db.permission.count(),
    db.referenceDataGroup.count(),
    db.systemSetting.count(),
    db.activityLog.count(),
  ]);

  const recent = await db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { action: true, createdAt: true, email: true },
  });
  const [recentUsers, recentCustomers, recentSuppliers] = await db.$transaction([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { displayName: true, email: true, firstName: true, id: true, lastName: true, status: true },
    }),
    db.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { email: true, id: true, name: true, trn: true },
    }),
    db.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { email: true, id: true, name: true, trn: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Administration"
        description="Control center for users, roles, permissions, reference data, system settings, database browsing, and audit review."
      />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <AdminStat label="Users" value={users} />
        <AdminStat label="Roles" value={roles} />
        <AdminStat label="Permissions" value={permissions} />
        <AdminStat label="Reference Tables" value={referenceGroups} />
        <AdminStat label="Settings" value={settings} />
        <AdminStat label="Audit Events" value={auditEvents} />
      </div>
      <AdminModuleGrid />
      <div className="grid gap-6 xl:grid-cols-3">
        <AdminDataTable title="Open Users" description="Open user records for review and editing.">
          <table className="min-w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {recentUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <Link href="/administration/users" className="font-semibold text-slate-950 hover:text-sky-700">
                      {user.displayName ?? `${user.firstName} ${user.lastName}`}
                    </Link>
                    <p className="text-xs text-slate-500">{user.email} | {user.status}</p>
                  </td>
                  <td className="px-4 py-3 text-right"><Link href={`/users/${user.id}`} className="font-semibold text-sky-700">Profile</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
        <AdminDataTable title="Open Customers" description="Open customer profile records.">
          <table className="min-w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {recentCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${customer.id}`} className="font-semibold text-slate-950 hover:text-sky-700">{customer.name}</Link>
                    <p className="text-xs text-slate-500">{customer.email ?? "No email"} | TRN {customer.trn ?? "not set"}</p>
                  </td>
                  <td className="px-4 py-3 text-right"><Link href={`/customers/${customer.id}`} className="font-semibold text-sky-700">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
        <AdminDataTable title="Open Suppliers" description="Open supplier profile records.">
          <table className="min-w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {recentSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-4 py-3">
                    <Link href={`/suppliers/${supplier.id}`} className="font-semibold text-slate-950 hover:text-sky-700">{supplier.name}</Link>
                    <p className="text-xs text-slate-500">{supplier.email ?? "No email"} | TRN {supplier.trn ?? "not set"}</p>
                  </td>
                  <td className="px-4 py-3 text-right"><Link href={`/suppliers/${supplier.id}`} className="font-semibold text-sky-700">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </div>
      <AdminDataTable title="Recent system activity" description="Latest audited system events.">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((item) => (
              <tr key={`${item.action}-${item.createdAt.toISOString()}`}>
                <td className="px-4 py-3 text-slate-500">{item.createdAt.toLocaleString("en-AE", { timeZone: "Asia/Dubai" })}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{item.email ?? "System"}</td>
                <td className="px-4 py-3 text-slate-700">{item.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminDataTable>
    </div>
  );
}
