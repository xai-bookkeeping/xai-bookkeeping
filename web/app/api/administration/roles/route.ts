import { NextRequest, NextResponse } from "next/server";
import { adminRoleMutationSchema } from "@/lib/admin-validations";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = adminRoleMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const input = parsed.data;
  const duplicate = await db.adminRole.findUnique({ where: { name: input.name }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "Role name already exists." }, { status: 409 });

  const permissions = await db.permission.findMany({
    where: { id: { in: input.permissionIds } },
    select: { id: true },
  });

  const role = await db.adminRole.create({
    data: {
      description: input.description || null,
      name: input.name,
      status: input.status,
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
    include: { permissions: { include: { permission: true } }, userAssignments: true },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "ADMIN_ROLE_CREATED" as never,
    email: session!.user.email,
    ip,
    metadata: { name: role.name, permissionIds: input.permissionIds },
    userAgent,
    userId: session!.user.id,
  });

  return NextResponse.json({ role }, { status: 201 });
}
