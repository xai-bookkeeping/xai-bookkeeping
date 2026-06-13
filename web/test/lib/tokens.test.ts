import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    userInvitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

describe("tokens", () => {
  beforeEach(() => {
    dbMock.verificationToken.create.mockReset();
    dbMock.verificationToken.delete.mockReset();
    dbMock.verificationToken.deleteMany.mockReset();
    dbMock.verificationToken.findUnique.mockReset();
    dbMock.passwordResetToken.create.mockReset();
    dbMock.passwordResetToken.findUnique.mockReset();
    dbMock.passwordResetToken.update.mockReset();
    dbMock.passwordResetToken.updateMany.mockReset();
    dbMock.userInvitation.findUnique.mockReset();
    dbMock.userInvitation.update.mockReset();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates 64-character hex tokens and hashes them deterministically", async () => {
    const { generateToken, hashToken } = await import("@/lib/tokens");

    const token = generateToken();

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("def"));
  });

  it("hashes and verifies passwords through the bcrypt boundary", async () => {
    vi.doMock("bcryptjs", () => ({
      default: {
        compare: vi.fn(async (password: string) => password === "StrongPass1!"),
        hash: vi.fn(async () => "hashed-password"),
      },
    }));

    const { hashPassword, verifyPassword } = await import("@/lib/tokens");

    await expect(hashPassword("StrongPass1!")).resolves.toBe("hashed-password");
    await expect(verifyPassword("StrongPass1!", "hashed-password")).resolves.toBe(true);
    await expect(verifyPassword("WrongPass1!", "hashed-password")).resolves.toBe(false);
  });

  it("creates verification tokens after invalidating existing ones", async () => {
    dbMock.verificationToken.deleteMany.mockResolvedValue({});
    dbMock.verificationToken.create.mockResolvedValue({});

    const { createVerificationToken, hashToken } = await import("@/lib/tokens");
    const token = await createVerificationToken("user-1");

    expect(dbMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(dbMock.verificationToken.create).toHaveBeenCalledWith({
      data: {
        expiresAt: new Date("2026-06-14T00:00:00.000Z"),
        tokenHash: hashToken(token),
        userId: "user-1",
      },
    });
  });

  it("consumes valid verification tokens and deletes expired ones", async () => {
    const { consumeVerificationToken, hashToken } = await import("@/lib/tokens");

    dbMock.verificationToken.findUnique.mockResolvedValueOnce(null);
    await expect(consumeVerificationToken("missing")).resolves.toBeNull();

    dbMock.verificationToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-12T23:59:59.000Z"),
      id: "expired",
      userId: "user-1",
    });
    await expect(consumeVerificationToken("expired-token")).resolves.toBeNull();
    expect(dbMock.verificationToken.delete).toHaveBeenCalledWith({
      where: { id: "expired" },
    });

    dbMock.verificationToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-13T01:00:00.000Z"),
      id: "valid",
      userId: "user-2",
    });
    await expect(consumeVerificationToken("valid-token")).resolves.toEqual({ userId: "user-2" });
    expect(dbMock.verificationToken.findUnique).toHaveBeenLastCalledWith({
      where: { tokenHash: hashToken("valid-token") },
    });
    expect(dbMock.verificationToken.delete).toHaveBeenLastCalledWith({
      where: { id: "valid" },
    });
  });

  it("creates password-reset tokens after invalidating prior active tokens", async () => {
    dbMock.passwordResetToken.updateMany.mockResolvedValue({});
    dbMock.passwordResetToken.create.mockResolvedValue({});

    const { createPasswordResetToken, hashToken } = await import("@/lib/tokens");
    const token = await createPasswordResetToken("user-1");

    expect(dbMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      data: { used: true },
      where: { used: false, userId: "user-1" },
    });
    expect(dbMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        expiresAt: new Date("2026-06-13T01:00:00.000Z"),
        tokenHash: hashToken(token),
        userId: "user-1",
      },
    });
  });

  it("consumes valid password-reset tokens and rejects used or expired ones", async () => {
    const { consumePasswordResetToken } = await import("@/lib/tokens");

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    await expect(consumePasswordResetToken("missing")).resolves.toBeNull();

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-13T01:00:00.000Z"),
      id: "used",
      used: true,
      userId: "user-1",
    });
    await expect(consumePasswordResetToken("used-token")).resolves.toBeNull();

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-12T23:59:59.000Z"),
      id: "expired",
      used: false,
      userId: "user-1",
    });
    await expect(consumePasswordResetToken("expired-token")).resolves.toBeNull();

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-13T01:00:00.000Z"),
      id: "valid",
      used: false,
      userId: "user-2",
    });
    await expect(consumePasswordResetToken("valid-token")).resolves.toEqual({ userId: "user-2" });
    expect(dbMock.passwordResetToken.update).toHaveBeenCalledWith({
      data: { used: true, usedAt: new Date("2026-06-13T00:00:00.000Z") },
      where: { id: "valid" },
    });
  });

  it("validates password-reset tokens by presence, usage state, and expiry", async () => {
    const { validatePasswordResetToken } = await import("@/lib/tokens");

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    await expect(validatePasswordResetToken("missing")).resolves.toBe(false);

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-13T01:00:00.000Z"),
      used: true,
    });
    await expect(validatePasswordResetToken("used-token")).resolves.toBe(false);

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-12T23:59:59.000Z"),
      used: false,
    });
    await expect(validatePasswordResetToken("expired-token")).resolves.toBe(false);

    dbMock.passwordResetToken.findUnique.mockResolvedValueOnce({
      expiresAt: new Date("2026-06-13T01:00:00.000Z"),
      used: false,
    });
    await expect(validatePasswordResetToken("valid-token")).resolves.toBe(true);
  });

  it("creates invitation tokens and validates only active invitations", async () => {
    dbMock.userInvitation.update.mockResolvedValue({});

    const { createUserInvitationToken, hashToken, validateUserInvitationToken } = await import("@/lib/tokens");
    const token = await createUserInvitationToken("invite-1");

    expect(dbMock.userInvitation.update).toHaveBeenCalledWith({
      data: {
        expiresAt: new Date("2026-06-20T00:00:00.000Z"),
        tokenHash: hashToken(token),
      },
      where: { id: "invite-1" },
    });

    dbMock.userInvitation.findUnique.mockResolvedValueOnce(null);
    await expect(validateUserInvitationToken("missing")).resolves.toBeNull();

    dbMock.userInvitation.findUnique.mockResolvedValueOnce({
      acceptedAt: new Date("2026-06-13T00:00:00.000Z"),
      expiresAt: new Date("2026-06-14T00:00:00.000Z"),
      revokedAt: null,
      user: { id: "user-1" },
    });
    await expect(validateUserInvitationToken("accepted-token")).resolves.toBeNull();

    const activeRecord = {
      acceptedAt: null,
      expiresAt: new Date("2026-06-14T00:00:00.000Z"),
      revokedAt: null,
      user: { id: "user-2" },
    };
    dbMock.userInvitation.findUnique.mockResolvedValueOnce(activeRecord);
    await expect(validateUserInvitationToken("active-token")).resolves.toBe(activeRecord);
  });
});
