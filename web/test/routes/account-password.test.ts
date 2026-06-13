import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "@/test/helpers/http";

const { auditMock, authMock, bcryptCompareMock, bcryptHashMock, dbMock, headersMock } = vi.hoisted(() => ({
  auditMock: vi.fn(),
  authMock: vi.fn(),
  bcryptCompareMock: vi.fn(),
  bcryptHashMock: vi.fn(),
  dbMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      updateMany: vi.fn(),
    },
  },
  headersMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: auditMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("POST /api/account/password", () => {
  beforeEach(() => {
    auditMock.mockReset();
    authMock.mockReset();
    bcryptCompareMock.mockReset();
    bcryptHashMock.mockReset();
    dbMock.user.findUnique.mockReset();
    dbMock.user.update.mockReset();
    dbMock.userSession.updateMany.mockReset();
    headersMock.mockReset();
    vi.resetModules();
  });

  it("rejects invalid password payloads", async () => {
    authMock.mockResolvedValue({
      activeSessionId: "session-1",
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });

    const { POST } = await import("@/app/api/account/password/route");
    const response = await POST(
      jsonRequest("http://localhost/api/account/password", "POST", {
        confirmPassword: "Mismatch1!",
        currentPassword: "Current1!",
        password: "NextPass1!",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Passwords do not match" });
  });

  it("returns unauthorized when the current user record is missing", async () => {
    authMock.mockResolvedValue({
      activeSessionId: "session-1",
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue(null);

    const { POST } = await import("@/app/api/account/password/route");
    const response = await POST(
      jsonRequest("http://localhost/api/account/password", "POST", {
        confirmPassword: "NextPass1!",
        currentPassword: "Current1!",
        password: "NextPass1!",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects incorrect current passwords", async () => {
    authMock.mockResolvedValue({
      activeSessionId: "session-1",
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue({
      googleId: null,
      passwordHash: "stored-hash",
    });
    bcryptCompareMock.mockResolvedValue(false);

    const { POST } = await import("@/app/api/account/password/route");
    const response = await POST(
      jsonRequest("http://localhost/api/account/password", "POST", {
        confirmPassword: "NextPass1!",
        currentPassword: "WrongPass1!",
        password: "NextPass1!",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Current password is incorrect." });
  });

  it("updates the password, enables password login, and revokes other sessions", async () => {
    authMock.mockResolvedValue({
      activeSessionId: "session-1",
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue({
      googleId: "google-1",
      passwordHash: "stored-hash",
    });
    dbMock.user.update.mockResolvedValue({});
    dbMock.userSession.updateMany.mockResolvedValue({});
    bcryptCompareMock.mockResolvedValue(true);
    bcryptHashMock.mockResolvedValue("new-hash");
    headersMock.mockResolvedValue(
      new Headers({
        "user-agent": "Vitest",
        "x-forwarded-for": "1.2.3.4",
      }),
    );

    const { POST } = await import("@/app/api/account/password/route");
    const response = await POST(
      jsonRequest("http://localhost/api/account/password", "POST", {
        confirmPassword: "NextPass1!",
        currentPassword: "Current1!",
        password: "NextPass1!",
      }),
    );

    expect(dbMock.user.update).toHaveBeenCalledWith({
      data: {
        authProvider: "EMAIL_AND_GOOGLE",
        passwordHash: "new-hash",
        passwordLoginEnabled: true,
        sessionVersion: { increment: 1 },
      },
      where: { id: "user-1" },
    });
    expect(dbMock.userSession.updateMany).toHaveBeenCalledWith({
      data: { revokedAt: expect.any(Date) },
      where: {
        id: { not: "session-1" },
        revokedAt: null,
        userId: "user-1",
      },
    });
    expect(auditMock).toHaveBeenCalledWith({
      action: "PASSWORD_CHANGED",
      email: "ada@example.com",
      ip: "1.2.3.4",
      userAgent: "Vitest",
      userId: "user-1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
