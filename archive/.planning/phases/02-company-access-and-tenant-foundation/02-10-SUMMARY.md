---
phase: 02-company-access-and-tenant-foundation
plan: 10
subsystem: auth
tags: [clerk, react, routing, tanstack-query, testing, tenant-isolation]

# Dependency graph
requires:
  - phase: 02-company-access-and-tenant-foundation (plans 02-08 and 02-09)
    provides: typed bootstrap readiness contract, local Clerk onboarding flow, and the cache-clearing company-switch behavior this gap plan extends
provides:
  - Typed readiness-aware shell branches for ready, setup-pending, and forbidden company access
  - Owner-first company setup handoff copy and retry CTA aligned to readiness
  - Cache-safe company switching with polite live feedback during readiness transitions
  - Regression coverage for workspace shell and company switcher behavior under the new flow
affects:
  - Phase 02 company-access-and-tenant-foundation follow-up work
  - future company-scoped workspace routes
  - shell-state and company-switcher regression tests

# Tech tracking
tech-stack:
  added: []
  patterns:
    - readiness-gated workspace shell
    - setup-handoff state instead of permission-error framing
    - cache-clearing company switch with accessible status feedback

key-files:
  created:
    - .planning/phases/02-company-access-and-tenant-foundation/02-10-SUMMARY.md
  modified:
    - frontend/src/routes/root.tsx
    - frontend/src/components/organisms/company-setup-required-state.tsx
    - frontend/src/components/molecules/company-switcher.tsx
    - frontend/src/test/workspace-shell.test.tsx
    - frontend/src/test/company-switcher.test.tsx
    - frontend/src/test/auth-routes.test.tsx
    - frontend/src/test/team-roles.test.tsx
    - frontend/src/test/company-settings-audit.test.tsx

key-decisions:
  - "Gate the authenticated shell on the typed bootstrap readiness contract before trusting company-scoped data."
  - "Reserve company lookup 403/404 outcomes for true forbidden access, not setup lag."
  - "Keep company switching cache-safe by preserving setActive(...) plus queryClient.clear() even when the destination company still needs setup."

patterns-established:
  - "Pattern 1: product shell state should branch on explicit backend readiness instead of inferring setup from generic errors."
  - "Pattern 2: setup-pending access should read as a calm company-workspace handoff, not an access-denied page."
  - "Pattern 3: company switching should clear stale company-scoped data before the next render and surface live status feedback."

requirements-completed: [AUTH-05, COMP-02, COMP-04, COMP-05, SETUP-01]

duration: 19 min
completed: 2026-06-09
---

# Phase 02: Company Access and Tenant Foundation Summary

**Readiness-aware workspace shell with setup-handoff and cache-safe company switching for the Phase 2 auth/company-access gap**

## Performance

- **Duration:** 19 min
- **Started:** 2026-06-09T05:14:29Z
- **Completed:** 2026-06-09T05:33:14Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Gated the authenticated shell on `/api/v1/auth/bootstrap`, with distinct ready, `company_context_pending`, and forbidden branches.
- Reframed the company setup state as a deliberate readiness handoff with product-owned copy and retry behavior.
- Kept company switching cache-safe across readiness changes and added polite live status feedback for switch results.
- Expanded shell and switcher regressions, plus the shared auth/team/settings harnesses, so the full frontend suite matches the new readiness flow.

## Task Commits

Each task was committed atomically:

1. **Task 1: Split workspace-ready, setup-pending, and forbidden shell states** - `5530e54` (`feat`)
2. **Task 2: Preserve company-switcher cache safety under the new readiness flow** - `a798906` (`feat`)

**Plan metadata:** recorded in the final docs commit

## Files Created/Modified

- `.planning/phases/02-company-access-and-tenant-foundation/02-10-SUMMARY.md` - execution record for the gap-closure plan
- `frontend/src/routes/root.tsx` - readiness-gated shell routing and company-access branching
- `frontend/src/components/organisms/company-setup-required-state.tsx` - setup-handoff copy and retry CTA
- `frontend/src/components/molecules/company-switcher.tsx` - cache-clearing switch flow and accessible status feedback
- `frontend/src/test/workspace-shell.test.tsx` - ready/pending/forbidden shell regressions
- `frontend/src/test/company-switcher.test.tsx` - cache safety and setup-pending switch regressions
- `frontend/src/test/auth-routes.test.tsx` - shared Clerk/mock harness updates for the new bootstrap shell behavior
- `frontend/src/test/team-roles.test.tsx` - bootstrap-ready test fixture
- `frontend/src/test/company-settings-audit.test.tsx` - bootstrap-ready test fixture

## Decisions Made

- Use the bootstrap readiness contract as the source of truth for shell branching so setup lag is not misclassified as forbidden access.
- Keep `403`/`404` company lookup failures reserved for real access denial, because same-org setup lag needs a different recovery path.
- Preserve `setActive(...)` followed by `queryClient.clear()` in the company switcher, even when the destination company still needs setup, so stale data never leaks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Aligned the shared frontend regression harnesses with the new readiness-gated shell**
- **Found during:** Task 1 (workspace shell readiness split)
- **Issue:** The new root shell waits on `/api/v1/auth/bootstrap`, so the shared auth/team/settings test harnesses could no longer mount the app without additional bootstrap-ready and Clerk mock setup.
- **Fix:** Added `useOrganization` support and a `waitFor` on the `/health` request in `frontend/src/test/auth-routes.test.tsx`, plus ready bootstrap responses in `frontend/src/test/team-roles.test.tsx` and `frontend/src/test/company-settings-audit.test.tsx`.
- **Files modified:** `frontend/src/test/auth-routes.test.tsx`, `frontend/src/test/team-roles.test.tsx`, `frontend/src/test/company-settings-audit.test.tsx`
- **Verification:** `rtk make test-frontend`
- **Committed in:** `5530e54`

**Total deviations:** 1 auto-fixed (1 blocking)

**Impact on plan:** Necessary harness alignment for the new readiness flow. No scope creep beyond keeping the full frontend regression suite green.

## Issues Encountered

- The shell readiness change affected shared auth/team/settings tests, so the focused shell tests were not enough on their own; the broader frontend suite had to pass as well.
- React Router emitted future-flag warnings during test runs. They were pre-existing and non-blocking.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The authenticated shell now separates workspace-ready, setup-pending, and forbidden company states.
- First-run users stay in a deliberate setup handoff until readiness completes.
- Company switching still clears stale data before the next company renders, so the next phase can build on a stable shell boundary.

## Known Stubs

- `frontend/src/test/auth-routes.test.tsx:299` - still asserts the intentional `English (UAE) - Arabic coming soon` placeholder from the Phase 2 onboarding flow; bilingual/RTL expansion remains deferred.

## Self-Check: PASSED

- `.planning/phases/02-company-access-and-tenant-foundation/02-10-SUMMARY.md` exists on disk.
- Task commit `5530e54` exists in git history.
- Task commit `a798906` exists in git history.
- Verification passed: `rtk docker compose run --rm frontend npm run test -- --run src/test/workspace-shell.test.tsx src/test/company-switcher.test.tsx`
- Verification passed: `rtk make test-backend`
- Verification passed: `rtk make test-frontend`

---
*Phase: 02-company-access-and-tenant-foundation*
*Completed: 2026-06-09*
