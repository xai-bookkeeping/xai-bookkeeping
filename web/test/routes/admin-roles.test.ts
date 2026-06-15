import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextJsonRequest } from "@/test/helpers/http";

const { auditMock, authMock, dbMock, headersMock } = vi.hoisted(() => ({
  auditMock: vi.fn(),
  authMock: vi.fn(),
  dbMock: {
    adminRole: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
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

describe("POST /api/administration/roles", () => {
  beforeEach(() => {
    auditMock.mockReset();
    authMock.mockReset();
    dbMock.adminRole.create.mockReset();
    dbMock.adminRole.findUnique.mockReset();
    dbMock.permission.findMany.mockReset();
    headersMock.mockReset();
    vi.resetModules();
  });

  it("rejects invalid role payloads", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });

    const { POST } = await import("@/app/api/administration/roles/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/roles", "POST", {
        name: "a",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects duplicate role names", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.adminRole.findUnique.mockResolvedValue({ id: "role-1" });

    const { POST } = await import("@/app/api/administration/roles/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/roles", "POST", {
        name: "Finance Approver",
        permissionIds: [],
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Role name already exists." });
  });

  it("creates roles with selected permissions and logs the audit event", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" },
    });
    dbMock.adminRole.findUnique.mockResolvedValue(null);
    dbMock.permission.findMany.mockResolvedValue([{ id: "perm-1" }, { id: "perm-2" }]);
    dbMock.adminRole.create.mockResolvedValue({
      id: "role-2",
      name: "_FINANCE_APPROVER",
      permissions: [
        { permission: { key: "finance.approve" }, permissionId: "perm-1" },
        { permission: { key: "finance.post" }, permissionId: "perm-2" },
      ],
      status: "ACTIVE",
      systemRole: false,
      userAssignments: [],
    });
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));

    const { POST } = await import("@/app/api/administration/roles/route");
    const response = await POST(
      nextJsonRequest("http://localhost/api/administration/roles", "POST", {
        description: "Can approve finance records",
        name: "finance_approver",
        permissionIds: ["perm-1", "perm-2"],
        status: "ACTIVE",
      }),
    );

    expect(dbMock.adminRole.create).toHaveBeenCalledWith({
      data: {
        description: "Can approve finance records",
        name: "_FINANCE_APPROVER",
        permissions: {
          create: [{ permissionId: "perm-1" }, { permissionId: "perm-2" }],
        },
        status: "ACTIVE",
      },
      include: { permissions: { include: { permission: true } }, userAssignments: true },
    });
    expect(auditMock).toHaveBeenCalledWith({
      action: "ADMIN_ROLE_CREATED",
      email: "admin@example.com",
      ip: "1.2.3.4",
      metadata: { name: "_FINANCE_APPROVER", permissionIds: ["perm-1", "perm-2"] },
      userAgent: undefined,
      userId: "admin-1",
    });
    expect(response.status).toBe(201);
  });
});
