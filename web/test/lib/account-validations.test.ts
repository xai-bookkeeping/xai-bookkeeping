import { describe, expect, it } from "vitest";
import {
  companyUpdateSchema,
  profileUpdateSchema,
} from "@/lib/account-validations";

describe("account validations", () => {
  it("trims profile updates and permits blank optional fields", () => {
    const parsed = profileUpdateSchema.parse({
      bio: "",
      displayName: "  Ada L. ",
      firstName: " Ada ",
      jobTitle: "",
      lastName: " Lovelace ",
      phone: "",
      username: " ada.lovelace ",
    });

    expect(parsed).toEqual({
      bio: "",
      displayName: "Ada L.",
      firstName: "Ada",
      jobTitle: "",
      lastName: "Lovelace",
      phone: "",
      username: "ada.lovelace",
    });
  });

  it("applies default brand colors to company updates", () => {
    const parsed = companyUpdateSchema.parse({
      country: "AE",
      currency: "AED",
      name: "XAI Books",
      timezone: "Asia/Dubai",
    });

    expect(parsed.primaryColor).toBe("#0ea5e9");
    expect(parsed.secondaryColor).toBe("#0f172a");
    expect(parsed.accentColor).toBe("#22c55e");
  });

});
