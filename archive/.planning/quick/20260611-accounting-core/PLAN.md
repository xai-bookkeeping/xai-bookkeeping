# Stage 12 Plan - Accounting Core Foundation

## Goal

Add the first accounting backbone: a controlled chart of accounts and journal-entry schema that later posting rules can use.

## Scope

- Add Prisma models for accounts, journal entries, and journal lines.
- Add enums for account type, account status, journal status, and source type.
- Create a migration for the new accounting tables.
- Add a default UAE SME chart-of-accounts service.
- Add API endpoints to list accounts/journals and seed missing default accounts.
- Add an authenticated `/accounting` page showing account balances and journal entries.
- Add Accounting navigation entry.

## Out of Scope

- Automatic invoice/payment/expense postings.
- Manual journal entry editor.
- Period close and reversal workflows.

## Verification

- Prisma generate
- TypeScript check
- Lint
- Production build

