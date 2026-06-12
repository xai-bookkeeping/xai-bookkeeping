import { companyUpdateSchema } from "@/lib/account-validations";
import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const parsed = companyUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

  const input = parsed.data;
  const company = await db.company.upsert({
    where: { ownerId: session.user.id },
    update: {
      address: input.address || null,
      city: input.city || null,
      country: input.country,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      accentColor: input.accentColor,
      currency: input.currency,
      email: input.email || null,
      name: input.name,
      phone: input.phone || null,
      taxNumber: input.taxNumber || null,
      timezone: input.timezone,
      website: input.website || null,
    },
    create: {
      address: input.address || null,
      city: input.city || null,
      country: input.country,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      accentColor: input.accentColor,
      currency: input.currency,
      email: input.email || null,
      name: input.name,
      ownerId: session.user.id,
      phone: input.phone || null,
      taxNumber: input.taxNumber || null,
      timezone: input.timezone,
      website: input.website || null,
    },
  });

  await db.user.update({
    where: { id: session.user.id },
    data: { companyName: company.name },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "COMPANY_UPDATED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ company });
}
