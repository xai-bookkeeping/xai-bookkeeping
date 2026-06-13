import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createVerificationToken(userId: string): Promise<string> {
  // Invalidate any existing tokens
  await db.verificationToken.deleteMany({ where: { userId } });

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.verificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function consumeVerificationToken(
  token: string,
): Promise<{ userId: string } | null> {
  const record = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await db.verificationToken.delete({ where: { id: record.id } });
    return null;
  }

  await db.verificationToken.delete({ where: { id: record.id } });
  return { userId: record.userId };
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  // Invalidate any existing reset tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function consumePasswordResetToken(
  token: string,
): Promise<{ userId: string } | null> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) return null;
  if (record.used) return null;
  if (record.expiresAt < new Date()) return null;

  await db.passwordResetToken.update({
    where: { id: record.id },
    data: { used: true, usedAt: new Date() },
  });

  return { userId: record.userId };
}

export async function validatePasswordResetToken(token: string): Promise<boolean> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record) return false;
  if (record.used) return false;
  if (record.expiresAt < new Date()) return false;
  return true;
}

export async function createUserInvitationToken(invitationId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.userInvitation.update({
    where: { id: invitationId },
    data: { tokenHash, expiresAt },
  });

  return token;
}

export async function validateUserInvitationToken(token: string) {
  const record = await db.userInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!record) return null;
  if (record.acceptedAt || record.revokedAt || record.expiresAt < new Date()) return null;

  return record;
}
