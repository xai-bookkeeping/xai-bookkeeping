import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { userListQuerySchema } from "@/lib/user-management-validations";

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = userListQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    role: request.nextUrl.searchParams.get("role") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? 1,
  });
  if (!parsed.success) return validationError(parsed.error);

  const { q, role, status, page } = parsed.data;
  const where = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { displayName: { contains: q, mode: "insensitive" as const } },
            { username: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await db.$transaction([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
        lastLoginAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  await request.json().catch(() => null);
  return NextResponse.json({ error: "Create users through Clerk invitations." }, { status: 400 });
}
