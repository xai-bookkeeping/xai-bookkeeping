# Stage 14 Plan - Premium App Shell

## Goal

Replace the authenticated top navigation with a premium SaaS application shell that puts the customer's company brand first.

## Scope

- Remove the old navigation-link header from the authenticated dashboard layout.
- Add a fixed left sidebar for desktop.
- Add collapsed sidebar support with persisted state.
- Add mobile drawer navigation.
- Add customer company header with logo, company name, and TRN.
- Add grouped navigation with icons and active states.
- Add a slim top utility header with global search, notifications, help, and user menu.
- Add sidebar user footer with avatar, name, role, last login, profile/settings/logout actions.
- Reuse existing routes and auth/session/company data.

## Out of Scope

- Dashboard content redesign.
- Settings/Profile redesign.
- New notification backend.
- Global search backend.

## Verification

- TypeScript check
- Lint
- Production build

