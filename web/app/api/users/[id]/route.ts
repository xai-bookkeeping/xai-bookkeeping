import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requestContext, validationError } from "@/lib/api-utils";
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
  const { error, session } = await requireAdmin();
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
      ...("firstName" in input ? { firstName: input.firstName } : {}),
      ...("lastName" in input ? { lastName: input.lastName } : {}),
      ...("displayName" in input ? { displayName: input.displayName || null } : {}),
      ...("username" in input ? { username: input.username || null } : {}),
      ...("phone" in input ? { phone: input.phone || null } : {}),
      ...("jobTitle" in input ? { jobTitle: input.jobTitle || null } : {}),
      ...("role" in input ? { role: input.role } : {}),
      ...("status" in input ? { status: input.status } : {}),
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
      lastLoginAt: true,
      createdAt: true,
    },
  });

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
      after: { role: nextRole, status: nextStatus, username: user.username },
    },
  });

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    },
  });
}
