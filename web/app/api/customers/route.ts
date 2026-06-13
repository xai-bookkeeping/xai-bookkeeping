import { NextRequest, NextResponse } from "next/server";
import { requireUser, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { customerListQuerySchema, customerMutationSchema } from "@/lib/customer-validations";
import { db } from "@/lib/db";

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = customerListQuerySchema.safeParse({
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

  const [total, customers] = await db.$transaction([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    customers: customers.map((customer) => ({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      deletedAt: customer.deletedAt?.toISOString() ?? null,
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
  });
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = customerMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const customer = await db.customer.create({
    data: {
      ...parsed.data,
      ownerId: session!.user.id,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "CUSTOMER_CREATED",
    email: session!.user.email,
    ip,
    userAgent,
    userId: session!.user.id,
    metadata: { customerId: customer.id, name: customer.name },
  });

  return NextResponse.json(
    {
      customer: {
        ...customer,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        deletedAt: null,
      },
    },
    { status: 201 },
  );
}
