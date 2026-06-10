import { changePasswordSchema } from "@/lib/account-validations";
import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/tokens";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = changePasswordSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return validationError("Current password is incorrect.");

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });

  await db.userSession.updateMany({
    where: {
      userId: session.user.id,
      id: { not: session.activeSessionId ?? "" },
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "PASSWORD_CHANGED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
