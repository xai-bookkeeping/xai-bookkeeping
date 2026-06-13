import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { companyLogoTypes, deletePublicUpload, storeImageUpload } from "@/lib/upload-storage";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return validationError("Company logo is required.");

  try {
    const current = await db.company.findUnique({
      where: { ownerId: session.user.id },
      select: { logoUrl: true },
    });
    const logoUrl = await storeImageUpload({
      allowedTypes: companyLogoTypes,
      file,
      kind: "company-logos",
    });
    const company = await db.company.upsert({
      where: { ownerId: session.user.id },
      update: { logoUrl },
      create: {
        logoUrl,
        name: session.user.companyName || "XAI Books workspace",
        ownerId: session.user.id,
      },
    });
    await deletePublicUpload(current?.logoUrl);

    const { ip, userAgent } = await requestContext();
    await logAuditEvent({
      action: "COMPANY_LOGO_UPDATED",
      email: session.user.email,
      ip,
      userAgent,
      userId: session.user.id,
    });

    return NextResponse.json({ logoUrl: company.logoUrl });
  } catch (uploadError) {
    return validationError(uploadError);
  }
}

export async function DELETE() {
  const { error, session } = await requireUser();
  if (error) return error;

  const company = await db.company.findUnique({
    where: { ownerId: session.user.id },
    select: { logoUrl: true },
  });

  await db.company.update({
    where: { ownerId: session.user.id },
    data: { logoUrl: null },
  });
  await deletePublicUpload(company?.logoUrl);

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "COMPANY_LOGO_REMOVED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ logoUrl: null });
}
