import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPageHeader, AdminStat, AdminTabBar } from "@/components/administration/AdminShell";
import { AdminUsersClient } from "@/components/administration/AdminUsersClient";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "User administration" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      roleAssignments: {
        where: { active: true },
        include: { role: true },
        orderBy: { assignedAt: "desc" },
      },
    },
  });
  const roles = await db.adminRole.findMany({
    orderBy: { name: "asc" },
    select: { description: true, id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="User administration with account status, login metadata, and multi-role assignments."
      />
      <AdminTabBar />
      <div className="grid gap-4 md:grid-cols-4">
        <AdminStat label="Total Users" value={users.length} />
        <AdminStat label="Active" value={users.filter((user) => user.status === "ACTIVE").length} />
        <AdminStat label="Disabled" value={users.filter((user) => user.status === "DISABLED").length} />
        <AdminStat label="Admins" value={users.filter((user) => user.roleAssignments.some((assignment) => assignment.role.name === "_ADMIN")).length} />
      </div>
      <AdminUsersClient
        roles={roles}
        initialUsers={users.map((user) => ({
          createdAt: user.createdAt.toISOString(),
          displayName: user.displayName,
          email: user.email,
          emailVerified: user.emailVerified,
          firstName: user.firstName,
          id: user.id,
          jobTitle: user.jobTitle,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          lastName: user.lastName,
          onboardingCompleted: user.onboardingCompleted,
          passwordLoginEnabled: user.passwordLoginEnabled,
          phone: user.phone,
          role: user.role,
          roleIds: user.roleAssignments.map((assignment) => assignment.roleId),
          roleNames: user.roleAssignments.map((assignment) => assignment.role.name),
          status: user.status,
          username: user.username,
        }))}
      />
    </div>
  );
}
