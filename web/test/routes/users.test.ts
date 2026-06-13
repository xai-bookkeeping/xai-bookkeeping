import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextJsonRequest } from "@/test/helpers/http";

const { auditMock, authMock, bcryptHashMock, dbMock, emailMock, headersMock } = vi.hoisted(() => ({
  auditMock: vi.fn(),
  authMock: vi.fn(),
  bcryptHashMock: vi.fn(),
  dbMock: {
    $transaction: vi.fn(),
    passwordResetToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  emailMock: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: auditMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: bcryptHashMock,
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: emailMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("/api/users", () => {
  beforeEach(() => {
    auditMock.mockReset();
    authMock.mockReset();
    bcryptHashMock.mockReset();
    dbMock.$transaction.mockReset();
    dbMock.passwordResetToken.create.mockReset();
    dbMock.passwordResetToken.updateMany.mockReset();
    dbMock.user.count.mockReset();
    dbMock.user.create.mockReset();
    dbMock.user.findMany.mockReset();
    dbMock.user.findUnique.mockReset();
    emailMock.mockReset();
    headersMock.mockReset();
    vi.resetModules();
    dbMock.$transaction.mockImplementation((queries) => Promise.all(queries));
  });

  it("rejects invalid list query parameters", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });

    const { GET } = await import("@/app/api/users/route");
    const response = await GET(new NextRequest("http://localhost/api/users?page=0"));

    expect(response.status).toBe(400);
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns a paginated user list for admins", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.user.count.mockResolvedValue(1);
    dbMock.user.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-06-13T00:00:00.000Z"),
        displayName: null,
        email: "ada@example.com",
        emailVerified: true,
        firstName: "Ada",
        id: "user-1",
        jobTitle: null,
        lastLoginAt: new Date("2026-06-13T01:00:00.000Z"),
        lastName: "Lovelace",
        phone: null,
        role: "ADMIN",
        status: "ACTIVE",
        username: "ada",
      },
    ]);

    const { GET } = await import("@/app/api/users/route");
    const response = await GET(new NextRequest("http://localhost/api/users?q=ada&page=1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      page: 1,
      pageSize: 12,
      total: 1,
      users: [
        {
          createdAt: "2026-06-13T00:00:00.000Z",
          displayName: null,
          email: "ada@example.com",
          emailVerified: true,
          firstName: "Ada",
          id: "user-1",
          jobTitle: null,
          lastLoginAt: "2026-06-13T01:00:00.000Z",
          lastName: "Lovelace",
          phone: null,
          role: "ADMIN",
          status: "ACTIVE",
          username: "ada",
        },
      ],
    });
  });

  it("rejects duplicate email addresses when creating a user", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue({ id: "existing-user" });

    const { POST } = await import("@/app/api/users/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/users", "POST", {
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
  });

  it("creates a managed user, issues a reset token, sends email, and logs the audit event", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.create.mockResolvedValue({
      createdAt: new Date("2026-06-13T00:00:00.000Z"),
      email: "ada@example.com",
      emailVerified: true,
      emailVerifiedAt: new Date("2026-06-13T00:00:00.000Z"),
      firstName: "Ada",
      id: "user-1",
      jobTitle: null,
      lastName: "Lovelace",
      passwordHash: "hashed-password",
      phone: null,
      role: "ADMIN",
      status: "ACTIVE",
    });
    dbMock.passwordResetToken.updateMany.mockResolvedValue({});
    dbMock.passwordResetToken.create.mockResolvedValue({});
    bcryptHashMock.mockResolvedValue("hashed-password");
    emailMock.mockResolvedValue(undefined);
    headersMock.mockResolvedValue(
      new Headers({
        "user-agent": "Vitest",
        "x-forwarded-for": "1.2.3.4",
      }),
    );

    const { POST } = await import("@/app/api/users/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/users", "POST", {
        email: "ADA@EXAMPLE.COM",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "ADMIN",
      }),
    );

    expect(dbMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "ada@example.com",
        emailVerified: true,
        emailVerifiedAt: expect.any(Date),
        firstName: "Ada",
        jobTitle: null,
        lastName: "Lovelace",
        passwordHash: "hashed-password",
        phone: null,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    expect(dbMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      data: { used: true },
      where: { used: false, userId: "user-1" },
    });
    expect(dbMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        expiresAt: expect.any(Date),
        tokenHash: expect.any(String),
        userId: "user-1",
      },
    });
    expect(emailMock).toHaveBeenCalledWith(
      "ada@example.com",
      "Ada Lovelace",
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    expect(auditMock).toHaveBeenCalledWith({
      action: "USER_CREATED_BY_ADMIN",
      email: "ada@example.com",
      ip: "1.2.3.4",
      metadata: { actorId: "admin-1", role: "ADMIN", status: "ACTIVE" },
      userAgent: "Vitest",
      userId: "user-1",
    });
    expect(response.status).toBe(201);
  });

  it("still succeeds when the password email cannot be sent", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.user.findUnique.mockResolvedValue(null);
    dbMock.user.create.mockResolvedValue({
      email: "ada@example.com",
      emailVerified: true,
      emailVerifiedAt: new Date("2026-06-13T00:00:00.000Z"),
      firstName: "Ada",
      id: "user-2",
      jobTitle: null,
      lastName: "Lovelace",
      passwordHash: "hashed-password",
      phone: null,
      role: "ACCOUNTANT",
      status: "ACTIVE",
    });
    dbMock.passwordResetToken.updateMany.mockResolvedValue({});
    dbMock.passwordResetToken.create.mockResolvedValue({});
    bcryptHashMock.mockResolvedValue("hashed-password");
    emailMock.mockRejectedValue(new Error("SMTP unavailable"));
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));

    const { POST } = await import("@/app/api/users/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/users", "POST", {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "ACCOUNTANT",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      user: {
        email: "ada@example.com",
        role: "ACCOUNTANT",
      },
    });
  });
});
