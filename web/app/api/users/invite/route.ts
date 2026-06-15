import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requestContext, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
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
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const client = await clerkClient();
  const invitation = await client.invitations.createInvitation({
    emailAddress: input.email,
    expiresInDays: 7,
    publicMetadata: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
    },
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin}/accept-invite`,
  });
  const { ip, userAgent } = await requestContext();

  await logAuditEvent({
    action: "USER_INVITED",
    email: input.email,
    ip,
    userAgent,
    metadata: {
      actorId: session!.user.id,
      clerkInvitationId: invitation.id,
      role: input.role,
    },
  });

  return NextResponse.json({ invitationId: invitation.id }, { status: 201 });
}
