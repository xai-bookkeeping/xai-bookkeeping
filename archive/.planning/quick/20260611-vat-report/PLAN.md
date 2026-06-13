# Stage 11 Plan - VAT Summary Report

## Goal

Add a UAE-first VAT summary report with source drill-downs for sales invoices and expenses.

## Scope

- Add authenticated `/reports/vat` page.
- Add `GET /api/reports/vat` with date range filters.
- Show output VAT from posted/paid invoices.
- Show input VAT from approved/paid expenses using the current expense schema's VAT-inclusive 5% assumption.
- Show net VAT payable or reclaimable.
- Include source rows for invoices and expenses.
- Add CSV export for report rows.
- Add Reports navigation entry.

## Out of Scope

- No expense VAT schema migration in this stage.
- No formal FTA return submission workflow.
- No ledger-based reconciliation until the accounting core stage exists.

## Verification

- TypeScript check
- Lint
- Production build

