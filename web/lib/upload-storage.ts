import crypto from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

type UploadKind = "avatars" | "company-logos";

export async function storeImageUpload({
  file,
  kind,
  allowedTypes,
}: {
  file: File;
  kind: UploadKind;
  allowedTypes: string[];
}): Promise<string> {
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Unsupported image type.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5MB or smaller.");
  }

  const extension = imageExtensions[file.type];
  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const directory = path.join(PUBLIC_UPLOAD_ROOT, kind);
  await mkdir(directory, { recursive: true });

  const filename = `${crypto.randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });

  return `/uploads/${kind}/${filename}`;
}

export async function deletePublicUpload(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith("/uploads/")) return;

  const normalized = path.normalize(url).replace(/^([/\\])+/, "");
  const fullPath = path.resolve(path.join(process.cwd(), "public", normalized));
  const uploadRoot = path.resolve(PUBLIC_UPLOAD_ROOT);

  if (!fullPath.startsWith(uploadRoot)) return;

  try {
    await unlink(fullPath);
  } catch {
    // Missing files should not block profile updates.
  }
}

export const avatarTypes = ["image/jpeg", "image/png", "image/webp"];
export const companyLogoTypes = ["image/jpeg", "image/png", "image/svg+xml"];
