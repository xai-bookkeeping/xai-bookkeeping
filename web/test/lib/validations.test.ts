import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validations";

describe("auth validations", () => {
  it("allows simple 8-character passwords for Clerk sign-up", () => {
    const parsed = registerSchema.parse({
      confirmPassword: "password",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      password: "password",
    });

    expect(parsed.password).toBe("password");
  });
});
