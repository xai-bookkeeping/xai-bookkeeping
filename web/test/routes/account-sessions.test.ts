import { beforeEach, describe, expect, it, vi } from "vitest";

const { auditMock, authMock, dbMock, headersMock } = vi.hoisted(() => ({
  auditMock: vi.fn(),
  authMock: vi.fn(),
  dbMock: {
    user: {
      update: vi.fn(),
    },
    userSession: {
      findMany: vi.fn(),
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

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("/api/account/sessions", () => {
  beforeEach(() => {
    auditMock.mockReset();
    authMock.mockReset();
    dbMock.user.update.mockReset();
    dbMock.userSession.findMany.mockReset();
    dbMock.userSession.updateMany.mockReset();
    headersMock.mockReset();
    vi.resetModules();
  });

  it("returns 401 when there is no active session", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/account/sessions/route");
    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns recent sessions for the current user", async () => {
    authMock.mockResolvedValue({
      activeSessionId: "session-2",
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });
    dbMock.userSession.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-06-13T00:00:00.000Z"),
        expiresAt: new Date("2026-06-14T00:00:00.000Z"),
        id: "session-2",
        ip: "1.2.3.4",
        lastSeenAt: new Date("2026-06-13T00:30:00.000Z"),
        revokedAt: null,
        userAgent: "Vitest",
      },
    ]);

    const { GET } = await import("@/app/api/account/sessions/route");
    const response = await GET();

    expect(dbMock.userSession.findMany).toHaveBeenCalledWith({
      orderBy: { lastSeenAt: "desc" },
      take: 20,
      where: { userId: "user-1" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activeSessionId: "session-2",
      sessions: [
        {
          createdAt: "2026-06-13T00:00:00.000Z",
          expiresAt: "2026-06-14T00:00:00.000Z",
          id: "session-2",
          ip: "1.2.3.4",
          lastSeenAt: "2026-06-13T00:30:00.000Z",
          revokedAt: null,
          userAgent: "Vitest",
        },
      ],
    });
  });

  it("revokes all sessions and logs the action", async () => {
    authMock.mockResolvedValue({
      activeSessionId: "session-2",
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });
    dbMock.user.update.mockResolvedValue({});
    dbMock.userSession.updateMany.mockResolvedValue({});
    headersMock.mockResolvedValue(
      new Headers({
        "user-agent": "Vitest",
        "x-forwarded-for": "1.2.3.4",
      }),
    );

    const { DELETE } = await import("@/app/api/account/sessions/route");
    const response = await DELETE();

    expect(dbMock.user.update).toHaveBeenCalledWith({
      data: { sessionVersion: { increment: 1 } },
      where: { id: "user-1" },
    });
    expect(dbMock.userSession.updateMany).toHaveBeenCalledWith({
      data: { revokedAt: expect.any(Date) },
      where: {
        revokedAt: null,
        userId: "user-1",
      },
    });
    expect(auditMock).toHaveBeenCalledWith({
      action: "SESSIONS_REVOKED",
      email: "ada@example.com",
      ip: "1.2.3.4",
      userAgent: "Vitest",
      userId: "user-1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
