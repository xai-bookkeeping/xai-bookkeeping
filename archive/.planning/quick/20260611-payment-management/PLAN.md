---
status: in-progress
stage: 7
---

# Stage 7: Payment Management

Build payment recording on top of posted invoices.

## Scope

- Add owner-scoped `Payment` model linked to invoices.
- Support payment methods: Cash, Bank Transfer, Card, Cheque.
- Support partial payments and outstanding balance calculation.
- Prevent overpayments.
- Automatically set invoice status to `PAID` when total payments cover invoice total.
- Add payment create/list/delete APIs.
- Add `/payments` page with posted invoice selector, amount, method, date, reference, notes, and payment history.
- Remove manual "mark paid" invoice action from the UI/API workflow so payments drive paid status.
- Add audit logging for payment create/delete and invoice paid.

## Verification

- Apply Prisma migration.
- Generate Prisma client.
- Run TypeScript validation.
- Run lint script.
- Run production build.
- Commit with `feat(payments): payment management`.
