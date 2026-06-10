import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { supplierListQuerySchema, supplierMutationSchema } from "@/lib/supplier-validations";

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = supplierListQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    page: request.nextUrl.searchParams.get("page") ?? 1,
  });
  if (!parsed.success) return validationError(parsed.error);

  const { q, page } = parsed.data;
  const where = {
    ownerId: session!.user.id,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { contactPerson: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
            { trn: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, suppliers] = await db.$transaction([
    db.supplier.count({ where }),
    db.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    suppliers: suppliers.map((supplier) => ({
      ...supplier,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
      deletedAt: supplier.deletedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = supplierMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const supplier = await db.supplier.create({
    data: {
      ...parsed.data,
      ownerId: session!.user.id,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "SUPPLIER_CREATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { supplierId: supplier.id, name: supplier.name },
  });

  return NextResponse.json(
    {
      supplier: {
        ...supplier,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
        deletedAt: null,
      },
    },
    { status: 201 },
  );
}
