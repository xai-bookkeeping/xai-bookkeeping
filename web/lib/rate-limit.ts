import { db } from "@/lib/db";

const MAX_ATTEMPTS = Number(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? 5);
const WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? 15);

export async function isRateLimited(email: string, ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: { gte: windowStart },
      },
    }),
    db.loginAttempt.count({
      where: {
        ip,
        success: false,
        createdAt: { gte: windowStart },
      },
    }),
  ]);

  return byEmail >= MAX_ATTEMPTS || byIp >= MAX_ATTEMPTS * 3;
}

export async function recordAttempt(
  email: string,
  ip: string,
  success: boolean,
  userId?: string,
): Promise<void> {
  await db.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      ip,
      success,
      userId: userId ?? null,
    },
  });
}

export async function getRemainingAttempts(email: string): Promise<number> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const count = await db.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  return Math.max(0, MAX_ATTEMPTS - count);
}

export async function getLockoutEnd(email: string): Promise<Date | null> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const oldest = await db.loginAttempt.findFirst({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!oldest) return null;
  return new Date(oldest.createdAt.getTime() + WINDOW_MINUTES * 60 * 1000);
}
