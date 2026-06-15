import path from "node:path";
import { defineConfig } from "vitest/config";

const coverageTargets = [
  "lib/account-validations.ts",
  "lib/admin-validations.ts",
  "lib/api-utils.ts",
  "lib/get-current-user.ts",
  "lib/permissions.ts",
  "lib/user-management-validations.ts",
  "app/api/account/profile/route.ts",
  "app/api/administration/roles/route.ts",
  "app/api/administration/sql/route.ts",
  "app/api/users/route.ts",
  "app/api/users/invite/route.ts",
  "app/api/webhooks/clerk/route.ts",
];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    coverage: {
      include: coverageTargets,
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        branches: 60,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
