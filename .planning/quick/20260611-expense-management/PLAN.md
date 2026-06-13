---
status: in-progress
stage: 8
---

# Stage 8: Expense Management

Build expense management on the existing authenticated web app.

## Scope

- Add owner-scoped `Expense` model linked to suppliers.
- Fields: supplier, category, amount, date, notes, attachment URL.
- Statuses: Draft, Approved, Paid.
- Add create/list/update/delete APIs.
- Add status workflow API for approve and mark paid.
- Enforce only Admin/Approver can approve expenses.
- Add `/expenses` page with search, status filter, form, table, and workflow actions.
- Add audit logging for create/update/delete/status changes.

## Verification

- Apply Prisma migration.
- Generate Prisma client.
- Run TypeScript validation.
- Run lint script.
- Run production build.
- Commit with `feat(expenses): expense management`.
