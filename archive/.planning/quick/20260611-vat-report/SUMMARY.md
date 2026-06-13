# Stage 11 Summary - VAT Summary Report

## Completed

- Added a dedicated `/reports/vat` page.
- Added a shared VAT report calculation module.
- Added `GET /api/reports/vat` with date range filters.
- Report shows output VAT, input VAT, net payable/reclaimable, and source rows.
- Added CSV export for VAT report rows and summary values.
- Added Reports navigation entry.
- Kept report data scoped to the authenticated user.

## VAT Basis

- Sales VAT uses posted and paid invoice VAT totals.
- Purchase VAT uses approved and paid expenses.
- Until expense VAT fields exist, purchase VAT assumes expense amounts are VAT-inclusive at the UAE 5% rate.

## Files Changed

- `web/app/(dashboard)/layout.tsx`
- `web/app/(dashboard)/reports/vat/page.tsx`
- `web/app/api/reports/vat/route.ts`
- `web/components/reports/VatReportClient.tsx`
- `web/lib/vat-report.ts`

## Database Migrations

- None.

## API Endpoints

- `GET /api/reports/vat`
  - `from`
  - `to`

## Verification

- `npm.cmd run build`
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`

