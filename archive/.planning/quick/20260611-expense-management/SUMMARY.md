---
status: complete
stage: 8
---

# Stage 8: Expense Management Summary

Implemented expense management on the existing authenticated web app.

## Completed

- Added owner-scoped `Expense` model linked to suppliers.
- Added fields for supplier, category, amount, date, notes, and attachment URL.
- Added statuses: Draft, Approved, Paid.
- Added expense create, list, update, delete APIs.
- Added status workflow API for approve and mark paid.
- Enforced approval permission for Admin and Approver roles.
- Added `/expenses` page with table, search, status filter, form, and workflow actions.
- Added expense audit events.

## Database

- Migration: `20260611140000_expense_management`
- Table: `xb_expenses`
- Enum: `ExpenseStatus`
- Audit actions: `EXPENSE_CREATED`, `EXPENSE_UPDATED`, `EXPENSE_APPROVED`, `EXPENSE_PAID`, `EXPENSE_DELETED`

## Verification

- `prisma migrate deploy` passed.
- `prisma generate` passed.
- `npm run build` passed.
- `npx tsc --noEmit` passed after Next refreshed route types.
- `npm run lint` passed.
