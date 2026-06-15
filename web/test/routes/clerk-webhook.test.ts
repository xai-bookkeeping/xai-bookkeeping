import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, verifyWebhookMock } = vi.hoisted(() => ({
  dbMock: {
    activityLog: { create: vi.fn() },
    user: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  verifyWebhookMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: verifyWebhookMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

describe("/api/webhooks/clerk", () => {
  beforeEach(() => {
    dbMock.activityLog.create.mockReset();
    dbMock.user.count.mockReset();
    dbMock.user.create.mockReset();
    dbMock.user.findUnique.mockReset();
    dbMock.user.update.mockReset();
    dbMock.user.updateMany.mockReset();
    dbMock.user.upsert.mockReset();
    verifyWebhookMock.mockReset();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test";
    vi.resetModules();
  });

  it("verifies and creates a local user from a new Clerk user", async () => {
    verifyWebhookMock.mockResolvedValue({
      data: {
        email_addresses: [{ email_address: "ADA@EXAMPLE.COM", id: "email_1" }],
        first_name: "Ada",
        id: "user_1",
        image_url: "https://example.com/ada.png",
        last_name: "Lovelace",
        primary_email_address_id: "email_1",
        public_metadata: {},
      },
      type: "user.created",
    });
    dbMock.user.count.mockResolvedValue(0);

    const { POST } = await import("@/app/api/webhooks/clerk/route");
    const request = new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(verifyWebhookMock).toHaveBeenCalledWith(request, { signingSecret: "whsec_test" });
    expect(dbMock.user.create).toHaveBeenCalledWith({
      data: {
        avatarUrl: "https://example.com/ada.png",
        clerkUserId: "user_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        onboardingCompleted: false,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    expect(dbMock.user.upsert).not.toHaveBeenCalled();
  });

  it("links an existing local user with the same email to a new Clerk user id", async () => {
    verifyWebhookMock.mockResolvedValue({
      data: {
        email_addresses: [{ email_address: "ADA@EXAMPLE.COM", id: "email_1" }],
        first_name: "Ada",
        id: "user_1",
        image_url: "https://example.com/ada.png",
        last_name: "Lovelace",
        primary_email_address_id: "email_1",
        public_metadata: {},
      },
      type: "user.created",
    });
    dbMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "local-user-1" });

    const { POST } = await import("@/app/api/webhooks/clerk/route");
    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(dbMock.user.update).toHaveBeenCalledWith({
      data: {
        avatarUrl: "https://example.com/ada.png",
        clerkUserId: "user_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
      },
      where: { id: "local-user-1" },
    });
    expect(dbMock.user.create).not.toHaveBeenCalled();
  });

  it("logs Clerk session creation as a login audit event", async () => {
    verifyWebhookMock.mockResolvedValue({
      data: { id: "sess_1", user_id: "user_1" },
      type: "session.created",
    });
    dbMock.user.findUnique.mockResolvedValue({ email: "ada@example.com", id: "local-user-1" });

    const { POST } = await import("@/app/api/webhooks/clerk/route");
    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(dbMock.user.update).toHaveBeenCalledWith({
      data: { lastLoginAt: expect.any(Date) },
      where: { id: "local-user-1" },
    });
    expect(dbMock.activityLog.create).toHaveBeenCalledWith({
      data: {
        action: "LOGIN_SUCCEEDED",
        email: "ada@example.com",
        metadata: { clerkSessionId: "sess_1" },
        userId: "local-user-1",
      },
    });
  });
});
