# Stage 13 Summary - Accounting Postings

## Completed

- Added balanced journal posting helpers in `web/lib/accounting.ts`.
- Invoice posting now creates:
  - Debit Accounts Receivable
  - Credit Sales Revenue
  - Credit Output VAT Payable
- Customer payment recording now creates:
  - Debit Bank Account
  - Credit Accounts Receivable
- Payment deletion now creates a reversing journal entry.
- Expense mark-paid now creates:
  - Debit expense account
  - Debit Input VAT Receivable
  - Credit Bank Account
- Posting helpers seed missing default system accounts during posting.
- Posting helpers are idempotent by source record to prevent duplicate entries.

## Files Changed

- `web/lib/accounting.ts`
- `web/app/api/invoices/[id]/status/route.ts`
- `web/app/api/payments/route.ts`
- `web/app/api/payments/[id]/route.ts`
- `web/app/api/expenses/[id]/status/route.ts`

## Database Migrations

- None.

## Verification

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `npm.cmd run build`

## Notes

- Expense postings use the same UAE 5% VAT-inclusive assumption as the VAT summary report until expense VAT fields are added.
- Manual journal entry editing, period locks, and full correction workflows remain future accounting stages.

