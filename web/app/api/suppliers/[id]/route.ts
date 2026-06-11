import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { supplierMutationSchema } from "@/lib/supplier-validations";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = supplierMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const existing = await db.supplier.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

  const supplier = await db.supplier.update({
    where: { id },
    data: parsed.data,
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "SUPPLIER_UPDATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: {
      supplierId: id,
      before: {
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        trn: existing.trn,
      },
      after: {
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        trn: supplier.trn,
      },
    },
  });

  return NextResponse.json({
    supplier: {
      ...supplier,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
      deletedAt: supplier.deletedAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_request: Request, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const existing = await db.supplier.findFirst({
    where: { id, ownerId: session!.user.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

  await db.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "SUPPLIER_DELETED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { supplierId: id, name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
