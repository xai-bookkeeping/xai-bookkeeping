import { preferencesUpdateSchema } from "@/lib/account-validations";
import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = preferencesUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const preferences = await db.userPreference.upsert({
    where: { userId: session.user.id },
    update: parsed.data,
    create: {
      ...parsed.data,
      userId: session.user.id,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "PREFERENCES_UPDATED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ preferences });
}
