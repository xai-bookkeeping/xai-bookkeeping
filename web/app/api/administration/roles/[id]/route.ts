import { NextRequest, NextResponse } from "next/server";
import { adminRoleMutationSchema } from "@/lib/admin-validations";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error, session } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = adminRoleMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const input = parsed.data;
  const existing = await db.adminRole.findUnique({
    where: { id },
    include: { permissions: true },
  });
  if (!existing) return NextResponse.json({ error: "Role not found." }, { status: 404 });

  const duplicate = await db.adminRole.findFirst({
    where: { id: { not: id }, name: input.name },
    select: { id: true },
  });
  if (duplicate) return NextResponse.json({ error: "Role name already exists." }, { status: 409 });

  const permissions = await db.permission.findMany({
    where: { id: { in: input.permissionIds } },
    select: { id: true },
  });
  const nextPermissionIds = new Set(permissions.map((permission) => permission.id));

  await db.$transaction([
    db.adminRole.update({
      where: { id },
      data: {
        description: input.description || null,
        name: input.name,
        status: existing.systemRole ? existing.status : input.status,
      },
    }),
    db.rolePermission.deleteMany({
      where: {
        roleId: id,
        permissionId: { notIn: [...nextPermissionIds] },
      },
    }),
    ...permissions.map((permission) =>
      db.rolePermission.upsert({
        where: { roleId_permissionId: { permissionId: permission.id, roleId: id } },
        update: {},
        create: { permissionId: permission.id, roleId: id },
      }),
    ),
  ]);

  const role = await db.adminRole.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true }, orderBy: { permission: { key: "asc" } } },
      userAssignments: { where: { active: true } },
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "ADMIN_ROLE_UPDATED" as never,
    email: session!.user.email,
    ip,
    metadata: {
      after: { name: input.name, permissionIds: input.permissionIds, status: input.status },
      before: { name: existing.name, permissionIds: existing.permissions.map((item) => item.permissionId), status: existing.status },
    },
    userAgent,
    userId: session!.user.id,
  });

  return NextResponse.json({ role });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { error, session } = await requireUser();
  if (error) return error;
  const { id } = await params;

  const existing = await db.adminRole.findUnique({
    where: { id },
    select: { name: true, systemRole: true },
  });
  if (!existing) return NextResponse.json({ error: "Role not found." }, { status: 404 });
  if (existing.systemRole) return NextResponse.json({ error: "System roles cannot be deleted." }, { status: 400 });

  await db.adminRole.delete({ where: { id } });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "ADMIN_ROLE_DELETED" as never,
    email: session!.user.email,
    ip,
    metadata: { name: existing.name },
    userAgent,
    userId: session!.user.id,
  });

  return NextResponse.json({ ok: true });
}
