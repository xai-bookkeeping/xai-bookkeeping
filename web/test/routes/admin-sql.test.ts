import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextJsonRequest } from "@/test/helpers/http";

const { auditMock, authMock, dbMock, headersMock } = vi.hoisted(() => ({
  auditMock: vi.fn(),
  authMock: vi.fn(),
  dbMock: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    sqlQueryHistory: {
      create: vi.fn(),
    },
  },
  headersMock: vi.fn(),
}));

vi.mock("@/lib/get-current-user", () => ({
  getCurrentUser: authMock,
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

describe("POST /api/administration/sql", () => {
  beforeEach(() => {
    auditMock.mockReset();
    authMock.mockReset();
    dbMock.$executeRawUnsafe.mockReset();
    dbMock.$queryRawUnsafe.mockReset();
    dbMock.sqlQueryHistory.create.mockReset();
    headersMock.mockReset();
    vi.resetModules();
  });

  it("blocks unsafe or multi-statement SQL", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));

    const { POST } = await import("@/app/api/administration/sql/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/sql", "POST", {
        sql: "select 1; delete from users",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only single SELECT, INSERT, UPDATE, and DELETE statements are enabled.",
    });
    expect(dbMock.sqlQueryHistory.create).toHaveBeenCalledWith({
      data: {
        error: "Only single SELECT, INSERT, UPDATE, and DELETE statements are enabled.",
        ownerId: "admin-1",
        sqlText: "select 1; delete from users",
        status: "BLOCKED",
      },
    });
    expect(auditMock).toHaveBeenCalledWith({
      action: "SQL_QUERY_BLOCKED",
      email: "admin@example.com",
      ip: "1.2.3.4",
      metadata: { sql: "select 1; delete from users" },
      userAgent: undefined,
      userId: "admin-1",
    });
  });

  it("runs SELECT queries with an automatic LIMIT and serializes the result", async () => {
    const decimal = {
      constructor: { name: "Decimal" },
      toString: () => "12.34",
    };

    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.$queryRawUnsafe.mockResolvedValue([
      {
        amount: BigInt(1),
        createdAt: new Date("2026-06-13T00:00:00.000Z"),
        nested: [{ total: decimal }],
      },
    ]);
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));

    const { POST } = await import("@/app/api/administration/sql/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/sql", "POST", {
        sql: "select * from users",
      }),
    );

    expect(dbMock.$queryRawUnsafe).toHaveBeenCalledWith("select * from users LIMIT 200");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      durationMs: expect.any(Number),
      rows: [
        {
          amount: "1",
          createdAt: "2026-06-13T00:00:00.000Z",
          nested: [{ total: "12.34" }],
        },
      ],
    });
  });

  it("preserves explicit LIMIT clauses on SELECT queries", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.$queryRawUnsafe.mockResolvedValue([]);
    headersMock.mockResolvedValue(new Headers());

    const { POST } = await import("@/app/api/administration/sql/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/sql", "POST", {
        sql: "select * from users limit 50",
      }),
    );

    expect(dbMock.$queryRawUnsafe).toHaveBeenCalledWith("select * from users limit 50");
    expect(response.status).toBe(200);
  });

  it("runs write queries and returns affected row counts", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.$executeRawUnsafe.mockResolvedValue(3);
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));

    const { POST } = await import("@/app/api/administration/sql/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/sql", "POST", {
        sql: "update users set last_login_at = now()",
      }),
    );

    expect(dbMock.$executeRawUnsafe).toHaveBeenCalledWith("update users set last_login_at = now()");
    await expect(response.json()).resolves.toEqual({
      affectedRows: 3,
      durationMs: expect.any(Number),
      rows: [],
    });
  });

  it("stores failed query executions and returns the error message", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.$queryRawUnsafe.mockRejectedValue(new Error("boom"));
    headersMock.mockResolvedValue(new Headers());

    const { POST } = await import("@/app/api/administration/sql/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/sql", "POST", {
        sql: "select * from users",
      }),
    );

    expect(dbMock.sqlQueryHistory.create).toHaveBeenCalledWith({
      data: {
        durationMs: expect.any(Number),
        error: "boom",
        ownerId: "admin-1",
        sqlText: "select * from users",
        status: "FAILED",
      },
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "boom" });
  });
});
