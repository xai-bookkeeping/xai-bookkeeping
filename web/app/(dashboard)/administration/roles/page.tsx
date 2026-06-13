import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPageHeader, AdminStat, AdminTabBar } from "@/components/administration/AdminShell";
import { AdminRolesClient } from "@/components/administration/AdminRolesClient";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Role administration" };

export default async function AdminRolesPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const roles = await db.adminRole.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: { include: { permission: true }, orderBy: { permission: { key: "asc" } } },
      userAssignments: { where: { active: true } },
    },
  });
  const permissions = await db.permission.findMany({
    orderBy: [{ module: "asc" }, { key: "asc" }],
    select: { action: true, description: true, id: true, key: true, module: true },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Roles"
        description="Configurable role definitions. Stage 2 adds create, clone, delete, and dual-list permission assignment actions."
      />
      <AdminTabBar />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStat label="Roles" value={roles.length} />
        <AdminStat label="System Roles" value={roles.filter((role) => role.systemRole).length} />
        <AdminStat label="Assignments" value={roles.reduce((sum, role) => sum + role.userAssignments.length, 0)} />
      </div>
      <AdminRolesClient
        permissions={permissions}
        initialRoles={roles.map((role) => ({
          description: role.description,
          id: role.id,
          name: role.name,
          permissionIds: role.permissions.map((item) => item.permissionId),
          permissionKeys: role.permissions.map((item) => item.permission.key),
          status: role.status,
          systemRole: role.systemRole,
          userCount: role.userAssignments.length,
        }))}
      />
    </div>
  );
}
