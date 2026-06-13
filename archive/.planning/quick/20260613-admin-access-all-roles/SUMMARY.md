---
status: completed
completed: 2026-06-13
task: admin-access-all-roles
---

# Summary

Temporarily exposed the Administration module to every authenticated role for demo mode.

## Delivered

- Administration sidebar section now appears for all logged-in users.
- Administration pages no longer redirect non-admin roles to the dashboard.
- SQL query API now allows any authenticated user, while remaining read-only SELECT-only.

## Verification

- Ran `npm.cmd run lint`; TypeScript passed.

## Note

- This is intentionally broad demo access. Stage 2 should replace it with selected-role and permission-based access checks.
