import { describe, expect, it } from "vitest";
import { adminRoleMutationSchema } from "@/lib/admin-validations";

describe("adminRoleMutationSchema", () => {
  it("normalizes role names to prefixed uppercase values", () => {
    const parsed = adminRoleMutationSchema.parse({
      description: " Can approve records ",
      name: "finance_approver",
      permissionIds: ["perm-1"],
    });

    expect(parsed).toEqual({
      description: "Can approve records",
      name: "_FINANCE_APPROVER",
      permissionIds: ["perm-1"],
      status: "ACTIVE",
    });
  });

  it("preserves a leading underscore when already present", () => {
    const parsed = adminRoleMutationSchema.parse({
      name: "_ops",
    });

    expect(parsed.name).toBe("_OPS");
    expect(parsed.permissionIds).toEqual([]);
  });

  it("rejects names shorter than two characters", () => {
    const result = adminRoleMutationSchema.safeParse({
      name: "a",
    });

    expect(result.success).toBe(false);
  });
});
