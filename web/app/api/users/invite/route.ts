import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendUserInvitationEmail } from "@/lib/email";
import { generateToken, hashPassword, hashToken } from "@/lib/tokens";
import { inviteUserSchema } from "@/lib/user-management-validations";

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = inviteUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const input = parsed.data;
  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "PENDING") {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const invitationToken = generateToken();
  const passwordHash = await hashPassword(generateToken());
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          status: "PENDING",
        },
      })
    : await db.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash,
          role: input.role,
          status: "PENDING",
        },
      });

  await db.userInvitation.updateMany({
    where: { userId: user.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const invitation = await db.userInvitation.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      tokenHash: hashToken(invitationToken),
      expiresAt,
      invitedById: session!.user.id,
      userId: user.id,
    },
  });

  const { ip, userAgent } = await requestContext();
  const actorName = session!.user.name || session!.user.email;

  try {
    await sendUserInvitationEmail(
      input.email,
      `${input.firstName} ${input.lastName}`.trim(),
      actorName,
      input.role,
      invitationToken,
    );
  } catch {
    // Non-fatal; the invitation can be resent later.
  }

  await logAuditEvent({
    action: "USER_INVITED",
    email: input.email,
    ip,
    userAgent,
    userId: user.id,
    metadata: {
      actorId: session!.user.id,
      invitationId: invitation.id,
      role: input.role,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return NextResponse.json({ invitationId: invitation.id, userId: user.id }, { status: 201 });
}
