# Stage 13 Plan - Accounting Postings

## Goal

Connect the finance workflows to the accounting backbone with balanced journal entries.

## Scope

- Add posting helpers for invoices, customer payments, expense payments, and payment deletion reversals.
- Use the default chart of accounts and seed missing system accounts during posting.
- Make postings idempotent by source record to prevent duplicate journal entries.
- Wire invoice posting to create receivable/revenue/output VAT journal entries.
- Wire customer payments to debit cash/bank and credit receivables.
- Wire paid expenses to debit expense/input VAT and credit bank.
- Wire payment deletion to create a reversing journal entry.

## Out of Scope

- Manual journal entry editor.
- Invoice/expense edit reversal workflows.
- Period close and locked accounting periods.

## Verification

- Prisma generate
- TypeScript check
- Lint
- Production build

