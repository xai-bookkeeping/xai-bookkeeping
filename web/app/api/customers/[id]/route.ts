import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { customerMutationSchema } from "@/lib/customer-validations";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = customerMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const existing = await db.customer.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const customer = await db.customer.update({
    where: { id },
    data: parsed.data,
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "CUSTOMER_UPDATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: {
      customerId: id,
      before: {
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        trn: existing.trn,
      },
      after: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        trn: customer.trn,
      },
    },
  });

  return NextResponse.json({
    customer: {
      ...customer,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      deletedAt: customer.deletedAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const existing = await db.customer.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  await db.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "CUSTOMER_DELETED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { customerId: id, name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
