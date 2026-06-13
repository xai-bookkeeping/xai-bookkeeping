---
status: in-progress
created: 2026-06-13
task: admin-module-stage-1
---

# Administration Module Stage 1

Build the administration foundation without breaking the existing single-role auth flow.

## Scope

- Add configurable roles, permissions, user-role assignments, reference data, settings, and SQL query metadata tables.
- Seed default roles, permissions, reference data, and settings from code.
- Add Administration navigation and overview.
- Add screens for Users, Roles, Permissions, Reference Data, System Settings, Database Explorer, and Audit Viewer.
- Keep SQL/database explorer read-only in Stage 1.

## Verification

- Prisma format.
- Migration deploy.
- Prisma generate where possible.
- TypeScript check.
