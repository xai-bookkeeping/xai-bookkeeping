---
status: in-progress
created: 2026-06-12
task: roles-approval-routing
---

# User Roles And Approval Routing

Extend the existing role system with explicit permission helpers and add
approval routing rules for invoices and expenses.

## Scope

- Keep existing roles: ADMIN, ACCOUNTANT, APPROVER, VIEWER.
- Add reusable permission helpers for finance actions.
- Add approval routing database model.
- Add route assignment fields on invoices and expenses.
- Add APIs for listing and managing approval routes.
- Enforce route-aware approval checks on invoice and expense approval.
- Add admin UI under Users for approval routing setup.
- Run Prisma generate, migration deploy, typecheck/build as feasible.

## Note

The current finance records are scoped by `ownerId = session.user.id`. This
phase preserves that boundary. A future company/tenant membership pass should
move finance records to company scope so assigned approvers can see teammate
documents directly.
