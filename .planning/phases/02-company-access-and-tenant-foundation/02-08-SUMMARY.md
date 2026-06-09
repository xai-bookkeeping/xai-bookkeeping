---
phase: 02-company-access-and-tenant-foundation
plan: 08
subsystem: auth
tags: [clerk, fastapi, tenant-isolation, webhook, pytest, postgres]

requires:
  - phase: 01-monorepo-and-api-web-foundations
    provides: FastAPI app shell, async SQLAlchemy sessions, and the monorepo backend routing/session base
  - phase: 02-company-access-and-tenant-foundation (plans 02-03, 02-05, 02-07)
    provides: Clerk-backed auth, tenant shadow rows, fixed roles, and audit helpers for the bootstrap gap to reuse
provides:
  - Typed `/api/v1/auth/bootstrap` readiness contract for `no_active_company`, `company_context_pending`, and `ready`
  - Company access guard that returns 409 for same-org missing shadow rows while preserving 403 for true foreign-company access
  - Shared Clerk snapshot materialization helper that reuses webhook-style upserts for first-run shadow-row sync
  - Backend regression coverage across auth, company authorization, role permissions, and audit events
affects: [Phase 02 frontend auth/onboarding gap closure, company switcher, workspace shell, future company-scoped APIs]

tech-stack:
  added: []
  patterns:
    - typed readiness endpoint
    - setup-pending conflict contract
    - webhook-style snapshot reconciliation
    - row-state access guard

key-files:
  created:
    - .planning/phases/02-company-access-and-tenant-foundation/02-08-SUMMARY.md
  modified:
    - backend/app/api/routes/auth.py
    - backend/app/platform/clerk_organizations.py
    - backend/app/platform/company_access.py
    - backend/app/platform/webhooks.py
    - backend/tests/test_auth.py
    - backend/tests/test_company_authorization.py
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Use a typed /api/v1/auth/bootstrap readiness endpoint for the authenticated principal's active Clerk organization."
  - "Treat same-org missing shadow rows as company_context_pending 409 instead of collapsing them into 403."
  - "Route first-run Clerk reconciliation through the existing webhook-style upsert path."

patterns-established:
  - "Pattern 1: readiness endpoints can distinguish absent company context from setup-pending and ready states without using authentication failures as a setup signal."
  - "Pattern 2: shared Clerk snapshot materialization should flow through the webhook sync path so bootstrap and webhook events stay idempotent."
  - "Pattern 3: company access should query local shadow rows explicitly, so missing records become a setup signal and true foreign-company access remains a 403."

requirements-completed: [AUTH-01, AUTH-05, COMP-01, COMP-03, COMP-05]

duration: 15 min
completed: 2026-06-09
---

# Phase 02: Company Access and Tenant Foundation Summary

**Typed auth bootstrap readiness with setup-pending company access and shared Clerk snapshot reconciliation for first-run company materialization**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-09T04:35:10Z
- **Completed:** 2026-06-09T04:50:25Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added `GET /api/v1/auth/bootstrap` with typed `no_active_company`, `company_context_pending`, and `ready` responses for the authenticated principal.
- Updated company access to return `409 company_context_pending` for same-org missing shadow rows while preserving `403` for true foreign-company access.
- Reused the existing Clerk webhook sync path to materialize first-run company shadow rows from an authenticated bootstrap snapshot.
- Expanded backend regression coverage to lock bootstrap readiness, company authorization, role permissions, and audit behavior together.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the backend bootstrap and setup-pending readiness contract** - `b7bdd11` (`feat`)
2. **Task 2: Lock the shared auth, organization, role, and audit regressions with one backend suite** - `ca1203f` (`test`)

**Plan metadata:** recorded in the final docs commit

## Files Created/Modified

- `.planning/phases/02-company-access-and-tenant-foundation/02-08-SUMMARY.md` - phase summary and execution record
- `backend/app/api/routes/auth.py` - bootstrap endpoint and typed readiness response
- `backend/app/platform/clerk_organizations.py` - Clerk active-company snapshot lookup helper
- `backend/app/platform/company_access.py` - setup-pending company access state and 409 detail contract
- `backend/app/platform/webhooks.py` - shared webhook-style Clerk snapshot materialization
- `backend/tests/test_auth.py` - bootstrap readiness regressions
- `backend/tests/test_company_authorization.py` - same-org pending-access regression
- `.planning/STATE.md` - execution state, decisions, metrics, and session continuity
- `.planning/ROADMAP.md` - phase progress sync
- `.planning/REQUIREMENTS.md` - completed Phase 2 requirement traceability

## Decisions Made

- Typed bootstrap readiness is the correct product signal for first-run company access, because frontend onboarding can branch on readiness instead of treating setup lag as authentication failure.
- Same-org missing shadow rows should return `409 company_context_pending`, because the backend needs a setup signal that is distinct from a real cross-company denial.
- Clerk reconciliation should continue through the webhook-oriented upsert path, so bootstrap and webhook events share one idempotent materialization flow.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Reactivated user shadow rows during non-deleted membership upserts**
- **Found during:** Task 1
- **Issue:** Bootstrap materialization could create a missing user row from membership data, but an already-existing inactive user row would stay inactive and leave the bootstrap contract stuck in `company_context_pending`.
- **Fix:** Set `user.is_active = True` for non-deleted organization membership upserts so the shared sync path can fully recover first-run company context.
- **Files modified:** `backend/app/platform/webhooks.py`
- **Verification:** `rtk docker compose run --rm backend pytest -q tests/test_auth.py tests/test_company_authorization.py tests/test_role_permissions.py tests/test_audit_events.py`, `rtk make test-backend`, and `rtk make test-frontend`
- **Committed in:** `b7bdd11`

**Total deviations:** 1 auto-fixed (1 missing critical)

**Impact on plan:** Necessary for first-run recovery to fully materialize the authenticated principal's company context without introducing a second sync path.

## Issues Encountered

- The GSD state/roadmap/requirements tooling uses direct `node .codex/get-shit-done/bin/gsd-tools.cjs <command>` invocations with named flags; the legacy `query` wrapper was not the right entrypoint in this environment.
- The backend and frontend verification suites both passed after the bootstrap and regression changes were applied.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The backend now exposes a deterministic readiness contract for the frontend auth/onboarding gap-closure work.
- Same-org setup lag is separated from true authorization failure, which should let the frontend route users into bootstrap/setup states without showing a hard permission error.
- No backend blockers remain for the next Phase 2 frontend plan.

## Self-Check: PASSED

- `backend/app/api/routes/auth.py` exists and includes the typed bootstrap endpoint.
- `backend/app/platform/clerk_organizations.py`, `backend/app/platform/company_access.py`, and `backend/app/platform/webhooks.py` contain the shared readiness and materialization logic.
- `backend/tests/test_auth.py` and `backend/tests/test_company_authorization.py` contain the new readiness regressions.
- Task commits `b7bdd11` and `ca1203f` both exist in git history.

---
*Phase: 02-company-access-and-tenant-foundation*
*Completed: 2026-06-09*
