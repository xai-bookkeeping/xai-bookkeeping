# Stage 10 Plan - Audit Trail

## Goal

Build a production-ready audit trail experience on top of the existing `ActivityLog` system without duplicating audit tables.

## Scope

- Add a dedicated authenticated `/audit` page.
- Show audit events with actor, action, IP address, user agent, timestamp, and metadata.
- Add filters for search, action category, exact action, and date range.
- Add summary cards for total events, security events, business events, and unique actors.
- Extend the existing account activity API with safe filtering and pagination.
- Add CSV export for the currently visible audit rows.
- Add the audit trail to authenticated navigation.

## Out of Scope

- No new audit table or migration unless the existing schema cannot support the UI.
- No cross-company audit viewer until multi-company ownership rules are formalized.

## Verification

- TypeScript check
- Lint
- Production build

