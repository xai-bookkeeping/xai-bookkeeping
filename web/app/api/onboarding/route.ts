import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const onboardingSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required.").max(200),
  taxNumber: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function PATCH(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = onboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const input = parsed.data;
  await db.$transaction([
    db.company.upsert({
      where: { ownerId: session.user.id },
      update: {
        name: input.companyName,
        taxNumber: input.taxNumber || null,
      },
      create: {
        email: session.user.email,
        name: input.companyName,
        ownerId: session.user.id,
        taxNumber: input.taxNumber || null,
      },
    }),
    db.user.update({
      where: { id: session.user.id },
      data: {
        companyName: input.companyName,
        onboardingCompleted: true,
      },
    }),
  ]);

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "ONBOARDING_COMPLETED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
