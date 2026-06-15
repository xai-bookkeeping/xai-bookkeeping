import { logAuditEvent } from "@/lib/audit";
import { profileUpdateSchema } from "@/lib/account-validations";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = profileUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const { username, ...data } = parsed.data;
  const normalizedUsername = username ? username.toLowerCase() : null;

  if (normalizedUsername) {
    const duplicate = await db.user.findFirst({
      where: {
        id: { not: session.user.id },
        username: normalizedUsername,
      },
      select: { id: true },
    });
    if (duplicate) return validationError("This username is already taken.");
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      ...data,
      displayName: data.displayName || null,
      jobTitle: data.jobTitle || null,
      phone: data.phone || null,
      bio: data.bio || null,
      username: normalizedUsername,
    },
    select: {
      avatarUrl: true,
      bio: true,
      createdAt: true,
      displayName: true,
      email: true,
      firstName: true,
      jobTitle: true,
      lastLoginAt: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      username: true,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "PROFILE_UPDATED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ user });
}
