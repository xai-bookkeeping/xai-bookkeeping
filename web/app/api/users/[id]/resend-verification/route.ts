import { NextResponse } from "next/server";
import { requireAdmin, requestContext } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/tokens";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Props) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true });
  if (user.status === "DISABLED") {
    return NextResponse.json({ error: "Disabled users cannot receive verification links." }, { status: 400 });
  }

  const token = await createVerificationToken(user.id);
  await sendVerificationEmail(user.email, `${user.firstName} ${user.lastName}`.trim(), token);

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "EMAIL_VERIFICATION_SENT",
    email: user.email,
    ip,
    userAgent,
    userId: user.id,
    metadata: { actorId: session!.user.id, adminResend: true },
  });

  return NextResponse.json({ ok: true });
}
