---
status: complete
stage: 7
---

# Stage 7: Payment Management Summary

Implemented payment recording on top of posted invoices.

## Completed

- Added owner-scoped `Payment` model linked to invoices.
- Added payment methods: Cash, Bank Transfer, Card, Cheque.
- Added partial payment support and outstanding balance calculation.
- Prevented overpayments.
- Automatically marks invoice `PAID` once payments cover invoice total.
- Reverts paid invoice back to `POSTED` if a payment is deleted and balance becomes outstanding.
- Added `/payments` page with invoice selector, amount, method, date, reference, notes, and payment history.
- Removed manual "mark paid" invoice UI/API action so payment status is driven by recorded payments.
- Added payment audit events.

## Database

- Migration: `20260611130000_payment_management`
- Table: `xb_payments`
- Enum: `PaymentMethod`
- Audit actions: `PAYMENT_RECORDED`, `PAYMENT_DELETED`

## Verification

- `prisma migrate deploy` passed.
- `prisma generate` passed.
- `npm run build` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` passed after Next route generation completed.
