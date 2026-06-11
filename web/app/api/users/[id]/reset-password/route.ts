import { NextResponse } from "next/server";
import { requireAdmin, requestContext } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/lib/tokens";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Props) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, lastName: true, status: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.status === "DISABLED") {
    return NextResponse.json({ error: "Disabled users cannot receive reset links." }, { status: 400 });
  }

  const token = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail(user.email, `${user.firstName} ${user.lastName}`.trim(), token);

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "USER_PASSWORD_RESET_SENT_BY_ADMIN",
    email: user.email,
    ip,
    userAgent,
    userId: user.id,
    metadata: { actorId: session!.user.id },
  });

  return NextResponse.json({ ok: true });
}
