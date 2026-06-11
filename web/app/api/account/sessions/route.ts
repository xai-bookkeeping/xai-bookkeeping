import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const { error, session } = await requireUser();
  if (error) return error;

  const sessions = await db.userSession.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ sessions, activeSessionId: session.activeSessionId });
}

export async function DELETE() {
  const { error, session } = await requireUser();
  if (error) return error;

  await db.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
  });

  await db.userSession.updateMany({
    where: {
      userId: session.user.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "SESSIONS_REVOKED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
