import { describe, expect, it } from "vitest";
import {
  inviteUserSchema,
  updateManagedUserSchema,
  userListQuerySchema,
} from "@/lib/user-management-validations";

describe("user-management validations", () => {
  it("applies defaults to user list queries", () => {
    const parsed = userListQuerySchema.parse({});

    expect(parsed).toEqual({
      page: 1,
      q: "",
    });
  });

  it("normalizes invite-user input and applies defaults", () => {
    const parsed = inviteUserSchema.parse({
      email: "ADMIN@EXAMPLE.COM",
      firstName: "  Ada ",
      lastName: " Lovelace ",
      role: "ADMIN",
    });

    expect(parsed).toEqual({
      email: "admin@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "ADMIN",
    });
  });

  it("rejects invalid managed usernames", () => {
    const result = updateManagedUserSchema.safeParse({
      username: "bad name",
    });

    expect(result.success).toBe(false);
  });
});
