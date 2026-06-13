import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { createPasswordResetToken, generateToken, hashPassword } from "@/lib/tokens";
import { createUserSchema, userListQuerySchema } from "@/lib/user-management-validations";

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
        emailVerified: true,
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
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const input = parsed.data;
  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(generateToken());
  const user = await db.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      jobTitle: input.jobTitle || null,
      passwordHash,
      role: input.role,
      status: input.status,
      emailVerified: input.status === "ACTIVE",
      emailVerifiedAt: input.status === "ACTIVE" ? new Date() : null,
    },
  });

  const token = await createPasswordResetToken(user.id);
  const { ip, userAgent } = await requestContext();

  try {
    await sendPasswordResetEmail(
      user.email,
      `${user.firstName} ${user.lastName}`.trim(),
      token,
    );
  } catch {
    // Non-fatal. Admin can send another password setup link from the table.
  }

  await logAuditEvent({
    action: "USER_CREATED_BY_ADMIN",
    email: user.email,
    ip,
    userAgent,
    userId: user.id,
    metadata: { actorId: session?.user.id, role: user.role, status: user.status },
  });

  return NextResponse.json({ user }, { status: 201 });
}
