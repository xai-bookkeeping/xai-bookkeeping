import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "@/test/helpers/http";

const { auditMock, authMock, dbMock, headersMock } = vi.hoisted(() => ({
  auditMock: vi.fn(),
  authMock: vi.fn(),
  dbMock: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

describe("PATCH /api/account/profile", () => {
  beforeEach(() => {
    auditMock.mockReset();
    authMock.mockReset();
    dbMock.user.findFirst.mockReset();
    dbMock.user.update.mockReset();
    headersMock.mockReset();
    vi.resetModules();
  });

  it("rejects invalid profile updates", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });

    const { PATCH } = await import("@/app/api/account/profile/route");
    const response = await PATCH(
      jsonRequest("http://localhost/api/account/profile", "PATCH", {
        firstName: "",
        lastName: "Lovelace",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "First name is required" });
  });

  it("rejects duplicate usernames", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });
    dbMock.user.findFirst.mockResolvedValue({ id: "other-user" });

    const { PATCH } = await import("@/app/api/account/profile/route");
    const response = await PATCH(
      jsonRequest("http://localhost/api/account/profile", "PATCH", {
        bio: "",
        displayName: "",
        firstName: "Ada",
        jobTitle: "",
        lastName: "Lovelace",
        phone: "",
        username: "ExistingUser",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "This username is already taken." });
  });

  it("normalizes optional profile fields and logs the update", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "ada@example.com", id: "user-1", role: "ADMIN" },
    });
    dbMock.user.findFirst.mockResolvedValue(null);
    dbMock.user.update.mockResolvedValue({
      avatarUrl: null,
      bio: null,
      createdAt: new Date("2026-06-13T00:00:00.000Z"),
      displayName: null,
      email: "ada@example.com",
      emailVerified: true,
      firstName: "Ada",
      jobTitle: null,
      lastLoginAt: null,
      lastName: "Lovelace",
      phone: null,
      role: "ADMIN",
      status: "ACTIVE",
      username: "ada.lovelace",
    });
    headersMock.mockResolvedValue(
      new Headers({
        "user-agent": "Vitest",
        "x-forwarded-for": "1.2.3.4",
      }),
    );

    const { PATCH } = await import("@/app/api/account/profile/route");
    const response = await PATCH(
      jsonRequest("http://localhost/api/account/profile", "PATCH", {
        bio: "",
        displayName: "",
        firstName: " Ada ",
        jobTitle: "",
        lastName: " Lovelace ",
        phone: "",
        username: " Ada.Lovelace ",
      }),
    );

    expect(dbMock.user.update).toHaveBeenCalledWith({
      data: {
        bio: null,
        displayName: null,
        firstName: "Ada",
        jobTitle: null,
        lastName: "Lovelace",
        phone: null,
        username: "ada.lovelace",
      },
      select: {
        avatarUrl: true,
        bio: true,
        createdAt: true,
        displayName: true,
        email: true,
        emailVerified: true,
        firstName: true,
        jobTitle: true,
        lastLoginAt: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        username: true,
      },
      where: { id: "user-1" },
    });
    expect(auditMock).toHaveBeenCalledWith({
      action: "PROFILE_UPDATED",
      email: "ada@example.com",
      ip: "1.2.3.4",
      userAgent: "Vitest",
      userId: "user-1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: {
        username: "ada.lovelace",
      },
    });
  });
});
