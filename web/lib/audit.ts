import type { AuditAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type AuditContext = {
  userId?: string | null;
  email?: string | null;
  action: AuditAction;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logAuditEvent({
  userId,
  email,
  action,
  ip,
  userAgent,
  metadata,
}: AuditContext): Promise<void> {
  await db.activityLog.create({
    data: {
      action,
      email: email?.toLowerCase() ?? null,
      ip: ip ?? null,
      metadata: metadata ?? undefined,
      userAgent: userAgent ?? null,
      userId: userId ?? null,
    },
  });
}
