---
status: in-progress
stage: 6
---

# Stage 6: Invoicing

Build invoice management for the existing authenticated web app.

## Scope

- Add invoice and invoice line models scoped to owner and customer.
- Support statuses: Draft, Submitted, Approved, Posted, Paid.
- Support multiple line items with description, quantity, unit price, VAT rate, and totals.
- Default UAE VAT to 5%.
- Enforce workflow actions:
  - Draft invoices can be edited.
  - Draft can submit.
  - Approver/Admin can approve submitted invoices.
  - Approved invoices can be posted.
- Add invoice create/list/detail/update/status APIs.
- Add `/invoices` page with table, create/edit form, totals, and workflow buttons.
- Add company/customer data for invoice-ready display.
- Add audit events for create/update/status changes.

## Verification

- Apply Prisma migration.
- Generate Prisma client.
- Run TypeScript validation.
- Run lint script.
- Run production build.
- Commit with `feat(invoices): invoice management`.
