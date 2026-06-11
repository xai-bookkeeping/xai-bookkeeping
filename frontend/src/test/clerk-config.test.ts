import { describe, expect, test } from "vitest";
import { resolveClerkPublishableKey } from "@/lib/clerk-config";

describe("resolveClerkPublishableKey", () => {
  test("prefers the Vite-prefixed Clerk key when present", () => {
    expect(
      resolveClerkPublishableKey({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_next_public",
        VITE_CLERK_PUBLISHABLE_KEY: "pk_test_vite",
      }),
    ).toBe("pk_test_vite");
  });

  test("falls back to the legacy NEXT_PUBLIC Clerk key for local compatibility", () => {
    expect(
      resolveClerkPublishableKey({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_next_public",
      }),
    ).toBe("pk_test_next_public");
  });

  test("returns the missing sentinel when no Clerk key is configured", () => {
    expect(resolveClerkPublishableKey({})).toBe("pk_test_missing");
  });
});
