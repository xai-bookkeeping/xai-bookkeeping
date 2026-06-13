---
status: complete
stage: 6
---

# Stage 6: Invoicing Summary

Implemented invoice management on the existing authenticated web app.

## Completed

- Added invoice and invoice line models with fixed-decimal money fields.
- Added multiple line items with quantity, unit price, VAT rate, subtotal, VAT, and total.
- Added UAE VAT default of 5%.
- Added invoice statuses: Draft, Submitted, Approved, Posted, Paid.
- Added workflow APIs for submit, approve, post, and mark paid.
- Enforced approval permissions for Admin and Approver roles.
- Added `/invoices` page with search, status filters, draft editor, line editor, totals, and workflow actions.
- Added invoice audit events.

## Database

- Migration: `20260611120000_invoice_management`
- Tables: `xb_invoices`, `xb_invoice_lines`
- Enum: `InvoiceStatus`
- Audit actions: `INVOICE_CREATED`, `INVOICE_UPDATED`, `INVOICE_SUBMITTED`, `INVOICE_APPROVED`, `INVOICE_POSTED`, `INVOICE_PAID`, `INVOICE_DELETED`

## Verification

- `prisma migrate deploy` passed.
- `prisma generate` passed.
- `npm run build` passed.
- `npx tsc --noEmit` passed after Next refreshed route types.
- `npm run lint` passed.
