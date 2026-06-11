import { logAuditEvent } from "@/lib/audit";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { avatarTypes, deletePublicUpload, storeImageUpload } from "@/lib/upload-storage";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { error, session } = await requireUser();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return validationError("Profile image is required.");

  try {
    const current = await db.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    });
    const avatarUrl = await storeImageUpload({
      allowedTypes: avatarTypes,
      file,
      kind: "avatars",
    });
    await db.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    });
    await deletePublicUpload(current?.avatarUrl);

    const { ip, userAgent } = await requestContext();
    await logAuditEvent({
      action: "AVATAR_UPDATED",
      email: session.user.email,
      ip,
      userAgent,
      userId: session.user.id,
    });

    return NextResponse.json({ avatarUrl });
  } catch (uploadError) {
    return validationError(uploadError);
  }
}

export async function DELETE() {
  const { error, session } = await requireUser();
  if (error) return error;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  });
  await deletePublicUpload(user?.avatarUrl);

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "AVATAR_REMOVED",
    email: session.user.email,
    ip,
    userAgent,
    userId: session.user.id,
  });

  return NextResponse.json({ avatarUrl: null });
}
