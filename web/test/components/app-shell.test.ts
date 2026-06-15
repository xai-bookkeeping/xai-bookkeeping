import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = () =>
  readFileSync(join(process.cwd(), "components/layout/AppShell.tsx"), "utf8");

describe("AppShell logout", () => {
  it("forces navigation after Clerk clears the session", () => {
    const appShell = source();

    expect(appShell).not.toContain("<form action={signOutAction}>");
    expect(appShell).toContain("void signOutAction().catch(() => undefined);");
    expect(appShell).not.toContain('await signOut({ redirectUrl: "/login" });');
    expect(appShell).not.toContain('redirectUrl: "/login"');
    expect(appShell).toContain("void signOut(redirectToLogin).catch(redirectToLogin);");
    expect(appShell).toContain('window.location.replace("/login");');
  });
});
