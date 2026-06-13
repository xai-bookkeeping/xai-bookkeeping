import { NextRequest, NextResponse } from "next/server";
import { approvalRouteUpdateSchema } from "@/lib/approval-route-validations";
import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireAdmin, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

function serialize(route: any) {
  return {
    ...route,
    maxAmount: route.maxAmount == null ? null : Number(route.maxAmount),
    minAmount: Number(route.minAmount),
    createdAt: route.createdAt.toISOString(),
    updatedAt: route.updatedAt.toISOString(),
  };
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = approvalRouteUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const existing = await db.approvalRoute.findFirst({
    where: { id, ownerId: session!.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Approval route not found." }, { status: 404 });

  const input = parsed.data;
  const minAmount = input.minAmount ?? Number(existing.minAmount);
  const maxAmount = input.maxAmount === undefined ? existing.maxAmount : input.maxAmount;
  if (maxAmount != null && Number(maxAmount) < minAmount) {
    return validationError("Maximum amount must be greater than or equal to minimum amount.");
  }

  const route = await db.approvalRoute.update({
    where: { id },
    data: {
      ...("active" in input ? { active: input.active } : {}),
      ...("approverId" in input ? { approverId: input.approverId || null } : {}),
      ...("approverRole" in input ? { approverRole: input.approverRole } : {}),
      ...("documentType" in input ? { documentType: input.documentType } : {}),
      ...("maxAmount" in input ? { maxAmount: input.maxAmount ?? null } : {}),
      ...("minAmount" in input ? { minAmount: input.minAmount } : {}),
      ...("name" in input ? { name: input.name } : {}),
      ...("priority" in input ? { priority: input.priority } : {}),
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "APPROVAL_ROUTE_UPDATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { routeId: route.id, documentType: route.documentType },
  });

  return NextResponse.json({ route: serialize(route) });
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await db.approvalRoute.findFirst({
    where: { id, ownerId: session!.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Approval route not found." }, { status: 404 });

  const route = await db.approvalRoute.update({
    where: { id },
    data: { active: false },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "APPROVAL_ROUTE_DELETED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { routeId: route.id, documentType: route.documentType },
  });

  return NextResponse.json({ route: serialize(route) });
}
