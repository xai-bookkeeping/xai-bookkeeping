import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginAttemptMock } = vi.hoisted(() => ({
  loginAttemptMock: {
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    loginAttempt: loginAttemptMock,
  },
}));

describe("rate-limit", () => {
  beforeEach(() => {
    loginAttemptMock.count.mockReset();
    loginAttemptMock.create.mockReset();
    loginAttemptMock.findFirst.mockReset();
    vi.resetModules();
  });

  it("blocks sign-in after too many failed attempts for an email address", async () => {
    loginAttemptMock.count.mockResolvedValueOnce(5).mockResolvedValueOnce(0);

    const { isRateLimited } = await import("@/lib/rate-limit");
    const blocked = await isRateLimited("ADMIN@EXAMPLE.COM", "1.2.3.4");

    expect(blocked).toBe(true);
    expect(loginAttemptMock.count.mock.calls[0]?.[0]).toEqual({
      where: {
        createdAt: { gte: expect.any(Date) },
        email: "admin@example.com",
        success: false,
      },
    });
  });

  it("blocks sign-in after too many failed attempts from the same IP address", async () => {
    loginAttemptMock.count.mockResolvedValueOnce(0).mockResolvedValueOnce(15);

    const { isRateLimited } = await import("@/lib/rate-limit");
    const blocked = await isRateLimited("user@example.com", "1.2.3.4");

    expect(blocked).toBe(true);
  });

  it("records attempts with normalized email addresses", async () => {
    loginAttemptMock.create.mockResolvedValue({});

    const { recordAttempt } = await import("@/lib/rate-limit");
    await recordAttempt("ADMIN@EXAMPLE.COM", "1.2.3.4", false, "user-1");

    expect(loginAttemptMock.create).toHaveBeenCalledWith({
      data: {
        email: "admin@example.com",
        ip: "1.2.3.4",
        success: false,
        userId: "user-1",
      },
    });
  });

  it("never returns a negative remaining attempt count", async () => {
    loginAttemptMock.count.mockResolvedValue(9);

    const { getRemainingAttempts } = await import("@/lib/rate-limit");
    const remaining = await getRemainingAttempts("admin@example.com");

    expect(remaining).toBe(0);
  });

  it("returns the end of the lockout window from the oldest failed attempt", async () => {
    const oldest = new Date("2026-06-13T00:00:00.000Z");
    loginAttemptMock.findFirst.mockResolvedValue({
      createdAt: oldest,
    });

    const { getLockoutEnd } = await import("@/lib/rate-limit");
    const result = await getLockoutEnd("admin@example.com");

    expect(result?.toISOString()).toBe("2026-06-13T00:15:00.000Z");
  });

  it("returns null when there is no active lockout window", async () => {
    loginAttemptMock.findFirst.mockResolvedValue(null);

    const { getLockoutEnd } = await import("@/lib/rate-limit");
    const result = await getLockoutEnd("admin@example.com");

    expect(result).toBeNull();
  });
});
