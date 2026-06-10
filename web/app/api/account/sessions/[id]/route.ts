import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Props) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { id } = await params;
  await db.userSession.updateMany({
    where: {
      id,
      userId: session.user.id,
    },
    data: { revokedAt: new Date() },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "SESSION_REVOKED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
    metadata: { sessionId: id },
  });

  return NextResponse.json({ ok: true });
}
