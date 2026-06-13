import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { updateManagedUserSchema } from "@/lib/user-management-validations";

interface Props {
  params: Promise<{ id: string }>;
}

async function adminCount() {
  return db.user.count({ where: { role: "ADMIN", status: { not: "DISABLED" } } });
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateManagedUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const existing = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      passwordLoginEnabled: true,
      onboardingCompleted: true,
      role: true,
      status: true,
      username: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const input = parsed.data;

  if (input.username) {
    const duplicate = await db.user.findFirst({
      where: { username: input.username, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Username is already in use." }, { status: 409 });
    }
  }

  if (input.email && input.email !== existing.email) {
    const duplicateEmail = await db.user.findFirst({
      where: { email: input.email, id: { not: id } },
      select: { id: true },
    });
    if (duplicateEmail) {
      return NextResponse.json({ error: "Email is already in use." }, { status: 409 });
    }
  }

  const nextRole = input.role ?? existing.role;
  const nextStatus = input.status ?? existing.status;
  const removingAdmin =
    existing.role === "ADMIN" && (nextRole !== "ADMIN" || nextStatus === "DISABLED");

  if (removingAdmin && (await adminCount()) <= 1) {
    return NextResponse.json({ error: "At least one active admin is required." }, { status: 400 });
  }

  if (session!.user.id === id && nextStatus !== "ACTIVE") {
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id },
    data: {
      ...("email" in input ? { email: input.email } : {}),
      ...("firstName" in input ? { firstName: input.firstName } : {}),
      ...("lastName" in input ? { lastName: input.lastName } : {}),
      ...("displayName" in input ? { displayName: input.displayName || null } : {}),
      ...("username" in input ? { username: input.username || null } : {}),
      ...("phone" in input ? { phone: input.phone || null } : {}),
      ...("jobTitle" in input ? { jobTitle: input.jobTitle || null } : {}),
      ...("role" in input ? { role: input.role } : {}),
      ...("status" in input ? { status: input.status } : {}),
      ...("emailVerified" in input
        ? {
            emailVerified: input.emailVerified,
            emailVerifiedAt: input.emailVerified ? new Date() : null,
          }
        : {}),
      ...("passwordLoginEnabled" in input ? { passwordLoginEnabled: input.passwordLoginEnabled } : {}),
      ...("onboardingCompleted" in input ? { onboardingCompleted: input.onboardingCompleted } : {}),
      ...(nextStatus === "DISABLED" || nextStatus === "SUSPENDED"
        ? { sessionVersion: { increment: 1 } }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      username: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      status: true,
      emailVerified: true,
      passwordLoginEnabled: true,
      onboardingCompleted: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (input.roleIds) {
    const validRoles = await db.adminRole.findMany({
      where: { id: { in: input.roleIds } },
      select: { id: true, name: true },
    });
    const validRoleIds = new Set(validRoles.map((role) => role.id));
    const currentAssignments = await db.userRoleAssignment.findMany({
      where: { userId: id },
      include: { role: true },
    });
    const requestedRoleIds = new Set(input.roleIds.filter((roleId) => validRoleIds.has(roleId)));

    await Promise.all([
      ...currentAssignments
        .filter((assignment) => !requestedRoleIds.has(assignment.roleId) && assignment.active)
        .map((assignment) =>
          db.userRoleAssignment.update({
            where: { id: assignment.id },
            data: { active: false, revokedAt: new Date() },
          }),
        ),
      ...validRoles.map((role) =>
        db.userRoleAssignment.upsert({
          where: { userId_roleId: { roleId: role.id, userId: id } },
          update: { active: true, assignedById: session!.user.id, revokedAt: null },
          create: { active: true, assignedById: session!.user.id, roleId: role.id, userId: id },
        }),
      ),
    ]);
  }

  if (nextStatus === "DISABLED" || nextStatus === "SUSPENDED") {
    await db.userSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action:
      existing.status !== "DISABLED" && nextStatus === "DISABLED"
        ? "USER_DEACTIVATED"
        : existing.status === "DISABLED" && nextStatus === "ACTIVE"
          ? "USER_REACTIVATED"
          : existing.role !== nextRole
            ? "USER_ROLE_CHANGED"
            : "USER_UPDATED_BY_ADMIN",
    email: existing.email,
    ip,
    userAgent,
    userId: id,
    metadata: {
      actorId: session!.user.id,
      before: { role: existing.role, status: existing.status, username: existing.username },
      after: {
        email: user.email,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
        passwordLoginEnabled: user.passwordLoginEnabled,
        role: nextRole,
        roleIds: input.roleIds,
        status: nextStatus,
        username: user.username,
      },
    },
  });

  if (input.roleIds) {
    await logAuditEvent({
      action: "ADMIN_USER_ROLE_ASSIGNED" as never,
      email: user.email,
      ip,
      userAgent,
      userId: id,
      metadata: { actorId: session!.user.id, roleIds: input.roleIds },
    });
  }

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    },
  });
}
