import { logAuditEvent } from "@/lib/audit";
import { requestContext, validationError } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { deletePublicUpload, partyCoverTypes, partyLogoTypes, storeImageUpload } from "@/lib/upload-storage";
import type { AuditAction } from "@prisma/client";
import { NextResponse } from "next/server";

type PartyKind = "customer" | "supplier";
type ImageKind = "cover" | "logo";

type SessionUser = {
  email: string;
  id: string;
};

function uploadKind(party: PartyKind, image: ImageKind) {
  return `${party}-${image === "cover" ? "covers" : "logos"}` as
    | "customer-covers"
    | "customer-logos"
    | "supplier-covers"
    | "supplier-logos";
}

function fieldName(image: ImageKind) {
  return image === "cover" ? "coverImageUrl" : "logoUrl";
}

async function findParty(party: PartyKind, id: string, ownerId: string) {
  if (party === "customer") {
    return db.customer.findFirst({
      where: { deletedAt: null, id, ownerId },
      select: { coverImageUrl: true, logoUrl: true, name: true },
    });
  }

  return db.supplier.findFirst({
    where: { deletedAt: null, id, ownerId },
    select: { coverImageUrl: true, logoUrl: true, name: true },
  });
}

async function updatePartyImage({
  id,
  image,
  ownerId,
  party,
  url,
}: {
  id: string;
  image: ImageKind;
  ownerId: string;
  party: PartyKind;
  url: string | null;
}) {
  const field = fieldName(image);

  if (party === "customer") {
    return db.customer.update({
      where: { id },
      data: { [field]: url },
      select: { coverImageUrl: true, logoUrl: true },
    });
  }

  return db.supplier.update({
    where: { id },
    data: { [field]: url },
    select: { coverImageUrl: true, logoUrl: true },
  });
}

async function logPartyImageEvent({
  image,
  name,
  party,
  removed,
  sessionUser,
}: {
  image: ImageKind;
  name: string;
  party: PartyKind;
  removed?: boolean;
  sessionUser: SessionUser;
}) {
  const actionMap: Record<`${PartyKind}.${ImageKind}.${"removed" | "updated"}`, AuditAction> = {
    "customer.cover.removed": "CUSTOMER_COVER_REMOVED" as AuditAction,
    "customer.cover.updated": "CUSTOMER_COVER_UPDATED" as AuditAction,
    "customer.logo.removed": "CUSTOMER_LOGO_REMOVED" as AuditAction,
    "customer.logo.updated": "CUSTOMER_LOGO_UPDATED" as AuditAction,
    "supplier.cover.removed": "SUPPLIER_COVER_REMOVED" as AuditAction,
    "supplier.cover.updated": "SUPPLIER_COVER_UPDATED" as AuditAction,
    "supplier.logo.removed": "SUPPLIER_LOGO_REMOVED" as AuditAction,
    "supplier.logo.updated": "SUPPLIER_LOGO_UPDATED" as AuditAction,
  };
  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: actionMap[`${party}.${image}.${removed ? "removed" : "updated"}`],
    email: sessionUser.email,
    ip,
    metadata: { name },
    userAgent,
    userId: sessionUser.id,
  });
}

export async function uploadPartyProfileImage({
  id,
  image,
  party,
  request,
  sessionUser,
}: {
  id: string;
  image: ImageKind;
  party: PartyKind;
  request: Request;
  sessionUser: SessionUser;
}) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return validationError(`${party} ${image} image is required.`);

  const current = await findParty(party, id, sessionUser.id);
  if (!current) return NextResponse.json({ error: `${party} not found.` }, { status: 404 });

  try {
    const url = await storeImageUpload({
      allowedTypes: image === "cover" ? partyCoverTypes : partyLogoTypes,
      file,
      kind: uploadKind(party, image),
    });
    const updated = await updatePartyImage({ id, image, ownerId: sessionUser.id, party, url });
    await deletePublicUpload(current[fieldName(image)]);
    await logPartyImageEvent({ image, name: current.name, party, sessionUser });

    return NextResponse.json({
      coverImageUrl: updated.coverImageUrl,
      logoUrl: updated.logoUrl,
    });
  } catch (error) {
    return validationError(error);
  }
}

export async function deletePartyProfileImage({
  id,
  image,
  party,
  sessionUser,
}: {
  id: string;
  image: ImageKind;
  party: PartyKind;
  sessionUser: SessionUser;
}) {
  const current = await findParty(party, id, sessionUser.id);
  if (!current) return NextResponse.json({ error: `${party} not found.` }, { status: 404 });

  await updatePartyImage({ id, image, ownerId: sessionUser.id, party, url: null });
  await deletePublicUpload(current[fieldName(image)]);
  await logPartyImageEvent({ image, name: current.name, party, removed: true, sessionUser });

  return NextResponse.json({
    coverImageUrl: image === "cover" ? null : current.coverImageUrl,
    logoUrl: image === "logo" ? null : current.logoUrl,
  });
}
