import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextJsonRequest } from "@/test/helpers/http";

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    $transaction: vi.fn(),
    user: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/get-current-user", () => ({
  getCurrentUser: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

describe("/api/users", () => {
  beforeEach(() => {
    authMock.mockReset();
    dbMock.$transaction.mockReset();
    dbMock.user.count.mockReset();
    dbMock.user.create.mockReset();
    dbMock.user.findMany.mockReset();
    dbMock.user.findUnique.mockReset();
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

  it("rejects direct local user creation after the Clerk migration", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });

    const { POST } = await import("@/app/api/users/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/users", "POST", {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "ADMIN",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Create users through Clerk invitations.",
    });
    expect(dbMock.user.create).not.toHaveBeenCalled();
  });
});
