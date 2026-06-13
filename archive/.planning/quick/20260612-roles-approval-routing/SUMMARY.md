---
status: complete
completed: 2026-06-12
task: roles-approval-routing
---

# Summary

Implemented role-aware approval routing for invoices and expenses.

## Delivered

- Approval route schema and migration.
- Route management APIs.
- Users page approval-routing admin panel.
- Shared role permission helpers.
- Routed invoice submit/approve/post checks.
- Expense lifecycle expanded to Draft -> Submitted -> Approved -> Paid.
- Routed expense submit/approve/payment checks.
- Audit events for route creation/update/delete and document assignment.

## Verification

- `npm.cmd run db:generate` with `PRISMA_GENERATE_NO_ENGINE=1`: passed.
- `npm.cmd run db:migrate:deploy`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Follow-Up

Finance records are still scoped to `ownerId = user.id`. Company/team-level
document visibility should be moved to a company membership model in a future
phase so assigned approvers can review teammates' submitted documents directly.
