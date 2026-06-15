import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, currentUserMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
  dbMock: {
    user: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

describe("getCurrentUser", () => {
  beforeEach(() => {
    dbMock.user.count.mockReset();
    dbMock.user.create.mockReset();
    dbMock.user.findUnique.mockReset();
    dbMock.user.update.mockReset();
    authMock.mockReset();
    currentUserMock.mockReset();
    vi.resetModules();
  });

  it("links an existing local user with the same email to the authenticated Clerk user", async () => {
    authMock.mockResolvedValue({ isAuthenticated: true, userId: "clerk_user_1" });
    currentUserMock.mockResolvedValue({
      emailAddresses: [{ emailAddress: "ADA@EXAMPLE.COM", id: "email_1" }],
      firstName: "Ada",
      imageUrl: "https://example.com/ada.png",
      lastName: "Lovelace",
      primaryEmailAddressId: "email_1",
      publicMetadata: {},
    });

    dbMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        avatarUrl: null,
        clerkUserId: "legacy_local_user_1",
        company: null,
        companyName: null,
        email: "ada@example.com",
        firstName: "Ada",
        id: "local-user-1",
        lastName: "Lovelace",
        onboardingCompleted: false,
        role: "ACCOUNTANT",
        roleAssignments: [],
        status: "ACTIVE",
      });
    dbMock.user.update.mockResolvedValue({
      avatarUrl: "https://example.com/ada.png",
      clerkUserId: "clerk_user_1",
      company: null,
      companyName: null,
      email: "ada@example.com",
      firstName: "Ada",
      id: "local-user-1",
      lastName: "Lovelace",
      onboardingCompleted: false,
      role: "ACCOUNTANT",
      roleAssignments: [],
      status: "ACTIVE",
    });

    const { getCurrentUser } = await import("@/lib/get-current-user");

    await expect(getCurrentUser()).resolves.toMatchObject({
      onboardingRequired: true,
      user: {
        authProvider: "CLERK",
        email: "ada@example.com",
        id: "local-user-1",
        image: "https://example.com/ada.png",
      },
    });
    expect(dbMock.user.update).toHaveBeenCalledWith({
      data: {
        avatarUrl: "https://example.com/ada.png",
        clerkUserId: "clerk_user_1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
      },
      include: {
        company: { select: { name: true } },
        roleAssignments: {
          include: { role: { select: { name: true } } },
          where: { active: true },
        },
      },
      where: { id: "local-user-1" },
    });
    expect(dbMock.user.create).not.toHaveBeenCalled();
  });
});
