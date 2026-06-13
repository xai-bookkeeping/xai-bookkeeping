import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, headersMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("api-utils", () => {
  beforeEach(() => {
    authMock.mockReset();
    headersMock.mockReset();
    vi.resetModules();
  });

  it("returns an unauthorized response when the session is missing", async () => {
    authMock.mockResolvedValue(null);

    const { requireUser } = await import("@/lib/api-utils");
    const result = await requireUser();

    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
    await expect(result.error?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns an unauthorized response when the session is expired", async () => {
    authMock.mockResolvedValue({ sessionExpired: true });

    const { requireUser } = await import("@/lib/api-utils");
    const result = await requireUser();

    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
    await expect(result.error?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns a forbidden response when a non-admin user requests admin access", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { id: "user-1", role: "VIEWER" },
    });

    const { requireAdmin } = await import("@/lib/api-utils");
    const result = await requireAdmin();

    expect(result.session?.user.id).toBe("user-1");
    expect(result.error?.status).toBe(403);
    await expect(result.error?.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns the active session for an admin user", async () => {
    authMock.mockResolvedValue({
      sessionExpired: false,
      user: { id: "admin-1", role: "ADMIN" },
    });

    const { requireAdmin } = await import("@/lib/api-utils");
    const result = await requireAdmin();

    expect(result.error).toBeNull();
    expect(result.session?.user.id).toBe("admin-1");
  });

  it("prefers x-forwarded-for when building request context", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        "user-agent": "Vitest",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        "x-real-ip": "9.9.9.9",
      }),
    );

    const { requestContext } = await import("@/lib/api-utils");
    const result = await requestContext();

    expect(result).toEqual({ ip: "1.2.3.4", userAgent: "Vitest" });
  });

  it("falls back to x-real-ip and unknown when forwarded headers are absent", async () => {
    headersMock.mockResolvedValue(new Headers());

    const { requestContext } = await import("@/lib/api-utils");
    const result = await requestContext();

    expect(result).toEqual({ ip: "unknown", userAgent: undefined });
  });

  it("formats validation errors from Error instances", async () => {
    const { validationError } = await import("@/lib/api-utils");

    const response = validationError(new Error("Boom"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Boom" });
  });

  it("formats validation errors from string messages", async () => {
    const { validationError } = await import("@/lib/api-utils");

    const response = validationError("Specific problem");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Specific problem" });
  });

  it("formats validation errors from unknown values", async () => {
    const { validationError } = await import("@/lib/api-utils");

    const response = validationError({ nope: true });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request." });
  });
});
