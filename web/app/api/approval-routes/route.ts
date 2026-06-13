import { NextRequest, NextResponse } from "next/server";
import { approvalRouteSchema } from "@/lib/approval-route-validations";
import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireAdmin, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";

function serialize(route: any) {
  return {
    ...route,
    maxAmount: route.maxAmount == null ? null : Number(route.maxAmount),
    minAmount: Number(route.minAmount),
    createdAt: route.createdAt.toISOString(),
    updatedAt: route.updatedAt.toISOString(),
  };
}

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const [routes, approvers] = await Promise.all([
    db.approvalRoute.findMany({
      where: { ownerId: session!.user.id },
      orderBy: [{ documentType: "asc" }, { priority: "asc" }, { minAmount: "asc" }],
    }),
    db.user.findMany({
      where: {
        role: { in: ["ADMIN", "APPROVER"] },
        status: "ACTIVE",
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        displayName: true,
        email: true,
        firstName: true,
        id: true,
        lastName: true,
        role: true,
      },
    }),
  ]);

  return NextResponse.json({
    approvers: approvers.map((user) => ({
      ...user,
      name: user.displayName ?? `${user.firstName} ${user.lastName}`.trim(),
    })),
    routes: routes.map(serialize),
  });
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const parsed = approvalRouteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const input = parsed.data;
  const route = await db.approvalRoute.create({
    data: {
      active: input.active,
      approverId: input.approverId || null,
      approverRole: input.approverRole,
      documentType: input.documentType,
      maxAmount: input.maxAmount ?? null,
      minAmount: input.minAmount,
      name: input.name,
      ownerId: session!.user.id,
      priority: input.priority,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "APPROVAL_ROUTE_CREATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { routeId: route.id, documentType: route.documentType },
  });

  return NextResponse.json({ route: serialize(route) }, { status: 201 });
}
