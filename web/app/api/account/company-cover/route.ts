import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { companyCoverTypes, deletePublicUpload, storeImageUpload } from "@/lib/upload-storage";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return validationError("Company cover image is required.");

  try {
    const current = await db.company.findUnique({
      where: { ownerId: session.user.id },
      select: { coverImageUrl: true },
    });
    const coverImageUrl = await storeImageUpload({
      allowedTypes: companyCoverTypes,
      file,
      kind: "company-covers",
    });
    const company = await db.company.upsert({
      where: { ownerId: session.user.id },
      update: { coverImageUrl },
      create: {
        coverImageUrl,
        name: session.user.companyName || "XAI Books workspace",
        ownerId: session.user.id,
      },
    });
    await deletePublicUpload(current?.coverImageUrl);

    const { ip, userAgent } = await requestContext();
    await logAuditEvent({
      action: "COMPANY_COVER_UPDATED",
      email: session.user.email,
      ip,
      userAgent,
      userId: session.user.id,
    });

    return NextResponse.json({ coverImageUrl: company.coverImageUrl });
  } catch (uploadError) {
    return validationError(uploadError);
  }
}

export async function DELETE() {
  const { error, session } = await requireUser();
  if (error) return error;

  const company = await db.company.findUnique({
    where: { ownerId: session.user.id },
    select: { coverImageUrl: true },
  });

  await db.company.update({
    where: { ownerId: session.user.id },
    data: { coverImageUrl: null },
  });
  await deletePublicUpload(company?.coverImageUrl);

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "COMPANY_COVER_REMOVED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ coverImageUrl: null });
}
