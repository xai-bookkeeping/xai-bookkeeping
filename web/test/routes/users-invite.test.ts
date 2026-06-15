import { describe, expect, it, beforeEach, vi } from "vitest";
import { nextJsonRequest } from "@/test/helpers/http";

const { auditMock, authMock, clerkClientMock, createInvitationMock, dbMock, headersMock } = vi.hoisted(() => ({
  auditMock: vi.fn(),
  authMock: vi.fn(),
  clerkClientMock: vi.fn(),
  createInvitationMock: vi.fn(),
  dbMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
  headersMock: vi.fn(),
}));

vi.mock("@/lib/get-current-user", () => ({
  getCurrentUser: authMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkClientMock,
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

describe("POST /api/users/invite", () => {
  beforeEach(() => {
    auditMock.mockReset();
    authMock.mockReset();
    clerkClientMock.mockReset();
    createInvitationMock.mockReset();
    dbMock.user.findUnique.mockReset();
    headersMock.mockReset();
    vi.resetModules();
    clerkClientMock.mockResolvedValue({
      invitations: {
        createInvitation: createInvitationMock,
      },
    });
  });

  it("rejects invalid invite payloads", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });

    const { POST } = await import("@/app/api/users/invite/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/users/invite", "POST", {
        email: "not-an-email",
        firstName: "",
        lastName: "Lovelace",
        role: "ADMIN",
      }),
    );

    expect(response.status).toBe(400);
    expect(createInvitationMock).not.toHaveBeenCalled();
  });

  it("rejects duplicate local users", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue({ id: "user-1" });

    const { POST } = await import("@/app/api/users/invite/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/users/invite", "POST", {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "ADMIN",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "A user with this email already exists.",
    });
    expect(createInvitationMock).not.toHaveBeenCalled();
  });

  it("creates a Clerk invitation and logs the audit event", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue(null);
    createInvitationMock.mockResolvedValue({ id: "inv_123" });
    headersMock.mockResolvedValue(
      new Headers({
        "user-agent": "Vitest",
        "x-forwarded-for": "1.2.3.4",
      }),
    );

    const { POST } = await import("@/app/api/users/invite/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/users/invite", "POST", {
        email: "ADA@EXAMPLE.COM",
        firstName: " Ada ",
        lastName: " Lovelace ",
        role: "ADMIN",
      }),
    );

    expect(createInvitationMock).toHaveBeenCalledWith({
      emailAddress: "ada@example.com",
      expiresInDays: 7,
      publicMetadata: {
        firstName: "Ada",
        lastName: "Lovelace",
        role: "ADMIN",
      },
      redirectUrl: "http://localhost/accept-invite",
    });
    expect(auditMock).toHaveBeenCalledWith({
      action: "USER_INVITED",
      email: "ada@example.com",
      ip: "1.2.3.4",
      metadata: {
        actorId: "admin-1",
        clerkInvitationId: "inv_123",
        role: "ADMIN",
      },
      userAgent: "Vitest",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ invitationId: "inv_123" });
  });
});
