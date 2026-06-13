# Stage 14 Summary - Premium App Shell

## Summary of Changes

- Replaced the authenticated top navigation with a fixed desktop sidebar.
- Added persisted collapsed sidebar mode.
- Added mobile drawer navigation.
- Added grouped navigation with active route states and icons.
- Added customer-first company branding with logo, company name, and TRN.
- Added sidebar user footer with avatar, name, role, last login, profile/settings/logout actions.
- Added slim utility header with global search, notifications, help, and user menu.
- Added user menu with profile, company, security, notifications, and logout options.

## Files Modified

- `web/app/(dashboard)/layout.tsx`

## Components Added

- `web/components/layout/AppShell.tsx`

## Database Changes

- None.

## Build Results

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `npm.cmd run build`

All passed.

## Screens Affected

- All authenticated pages under the dashboard layout:
  - Dashboard
  - Customers
  - Suppliers
  - Invoices
  - Payments
  - Expenses
  - Accounting
  - Reports
  - Audit Trail
  - Users
  - Settings

## Remaining Tasks

- Dashboard redesign.
- Profile/settings premium redesign.
- Empty states and table polish.
- Real global search backend.
- Real notifications backend.

## Git Commit Message

- `feat(ui): add premium app shell`

