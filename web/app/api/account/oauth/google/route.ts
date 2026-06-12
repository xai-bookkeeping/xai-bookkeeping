import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE() {
  const { error, session } = await requireUser();
  if (error) return error;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      googleId: true,
      passwordLoginEnabled: true,
    },
  });

  if (!user?.googleId) {
    return NextResponse.json({ error: "Google is not connected." }, { status: 400 });
  }

  if (!user.passwordLoginEnabled) {
    return NextResponse.json(
      { error: "Set a password before disconnecting Google." },
      { status: 400 },
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      authProvider: "EMAIL",
      googleId: null,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "GOOGLE_ACCOUNT_DISCONNECTED",
    email: user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({
    authProvider: "EMAIL",
    googleConnected: false,
  });
}
