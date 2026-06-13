---
phase: 02-company-access-and-tenant-foundation
plan: 09
subsystem: auth
tags: [clerk, react, routing, tanstack-query, openapi]

requires:
  - phase: 01-monorepo-and-api-web-foundations
    provides: Split frontend/backend app boundary, generated client pipeline, and React/Vite shell
  - phase: 02-company-access-and-tenant-foundation
    provides: Backend bootstrap readiness contract and company-context pending/ready states from 02-08
provides:
  - Local Clerk adapter with safe SignedIn/SignedOut wrappers
  - Bootstrap-gated company-creation and onboarding handoff
  - Regenerated frontend client for `/api/v1/auth/bootstrap`
affects: [Phase 02 frontend onboarding, Phase 02 workspace shell follow-up, future auth pages]

tech-stack:
  added:
    - @hey-api/openapi-ts generated auth bootstrap client
    - local Clerk runtime adapter
    - TanStack Query readiness polling for company setup
  patterns:
    - local post-auth decision path
    - bootstrap-gated company setup handoff
    - owner-first split-screen auth entrypoints

key-files:
  created:
    - frontend/src/lib/clerk.ts
    - frontend/src/routes/auth/sign-up.tsx
  modified:
    - frontend/src/api/index.ts
    - frontend/src/api/sdk.gen.ts
    - frontend/src/api/types.gen.ts
    - frontend/src/app/router.tsx
    - frontend/src/main.tsx
    - frontend/src/routes/auth/sign-in.tsx
    - frontend/src/routes/auth/create-company.tsx
    - frontend/src/test/auth-routes.test.tsx

key-decisions:
  - "Route every successful auth event into /create-company first so the local app, not Clerk, owns the post-auth decision path."
  - "Define SignedIn and SignedOut locally in frontend/src/lib/clerk.ts to avoid depending on missing Clerk exports at runtime."
  - "Use /api/v1/auth/bootstrap as the company-setup readiness gate and only navigate to /workspace after the backend reports ready."

patterns-established:
  - "Pattern 1: auth success paths should land in a product-owned setup checkpoint before the workspace opens."
  - "Pattern 2: Clerk runtime symbols should be wrapped behind a local adapter so unsupported package exports cannot blank-screen the app."
  - "Pattern 3: bootstrap status is the source of truth for first-run company readiness."

requirements-completed: [AUTH-01, AUTH-05, SETUP-01]

duration: 21 min
completed: 2026-06-09
---

# Phase 02: Company Access and Tenant Foundation Summary

**Clerk-backed sign-in and sign-up now route into a bootstrap-gated company setup path with a local Clerk adapter and generated auth bootstrap client**

## Performance

- **Duration:** 21 min
- **Started:** 2026-06-09T04:50:30Z
- **Completed:** 2026-06-09T05:11:40Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added a local Clerk adapter that exports safe `SignedIn`/`SignedOut` wrappers and keeps auth runtime usage behind one product-owned surface.
- Regenerated the frontend client for the backend `/api/v1/auth/bootstrap` contract and wired the create-company route to it.
- Reworked sign-in, sign-up, and create-company into a single post-auth onboarding path that stays on the setup screen until the backend reports readiness.
- Expanded the auth-route regression suite to cover callback-path stability, local fallback redirects, and the bootstrap handoff behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Centralize Clerk runtime and auth routing** - `2b715f5` (`feat`)
2. **Task 2: Rebuild auth onboarding flow around bootstrap readiness** - `20cf952` (`feat`)

**Plan metadata:** recorded in the final docs commit

## Files Created/Modified

- `frontend/src/lib/clerk.ts` - Local Clerk adapter and safe auth-gate wrappers
- `frontend/src/routes/auth/sign-up.tsx` - Split-screen owner-first sign-up entrypoint
- `frontend/src/api/index.ts` - Added auth bootstrap SDK export
- `frontend/src/api/sdk.gen.ts` - Regenerated auth bootstrap client call
- `frontend/src/api/types.gen.ts` - Regenerated auth bootstrap response types
- `frontend/src/app/router.tsx` - Routed signed-in users into `/create-company`
- `frontend/src/main.tsx` - ClerkProvider fallback redirects now target setup
- `frontend/src/routes/auth/sign-in.tsx` - Split-screen sign-in copy and create-company CTA
- `frontend/src/routes/auth/create-company.tsx` - Bootstrap-gated company setup handoff
- `frontend/src/test/auth-routes.test.tsx` - Callback stability and readiness-gating regressions

## Decisions Made

- Use `/create-company` as the local post-auth decision path so Clerk success callbacks never jump straight into the workspace.
- Keep `SignedIn` and `SignedOut` local to the app because the installed Clerk package does not export them.
- Gate the company setup screen on `/api/v1/auth/bootstrap` so the workspace only opens after the backend says the company context is ready.
- Keep the sign-in and sign-up split-screen layouts owner-first and product-owned, with calm copy instead of provider error language.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added local Clerk auth-gate wrappers because the installed Clerk package does not export `SignedIn`/`SignedOut`**
- **Found during:** Task 1 (Clerk runtime centralization)
- **Issue:** Importing those names directly from `@clerk/react` caused a runtime parse/build failure risk and matched the blank-page regression reported in Phase 2 UAT.
- **Fix:** Added `SignedIn` and `SignedOut` wrappers in `frontend/src/lib/clerk.ts` that use `useAuth()` instead of relying on missing package exports.
- **Files modified:** `frontend/src/lib/clerk.ts`, `frontend/src/app/router.tsx`, `frontend/src/main.tsx`, `frontend/src/routes/auth/sign-in.tsx`, `frontend/src/routes/auth/create-company.tsx`, `frontend/src/routes/auth/sign-up.tsx`
- **Verification:** `rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx`, `rtk make test-backend`, and `rtk make test-frontend`
- **Committed in:** `2b715f5`

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary runtime hardening. No scope creep; the adapter is the smallest safe fix for the export mismatch.

## Issues Encountered

- The initial Clerk adapter draft used JSX in a `.ts` file and failed Vitest/Vite parsing. Switching the wrappers to return `children` directly resolved the issue.
- The shared auth-route regression file had to cover both the router fallback and the onboarding handoff, so the final test suite validated the full flow after the onboarding screens were completed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Signed-in users now land in the product-owned onboarding checkpoint before workspace entry.
- The frontend is wired to the backend bootstrap readiness contract, so setup can remain visible until company context is actually ready.
- The remaining Phase 2 gap is the workspace shell/company switcher follow-up in 02-10.

## Known Stubs

- `frontend/src/routes/auth/sign-in.tsx:115` and `frontend/src/routes/auth/sign-up.tsx:110` - The footer copy says `English (UAE) - Arabic coming soon`, which is intentional Phase 2 placeholder text for the bilingual/RTL work deferred to Phase 6.

## Self-Check: PASSED

- `.planning/phases/02-company-access-and-tenant-foundation/02-09-SUMMARY.md` exists on disk.
- Task commit `2b715f5` exists in git history.
- Task commit `20cf952` exists in git history.
- Verification passed: `rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx`
- Verification passed: `rtk make test-backend`
- Verification passed: `rtk make test-frontend`

---
*Phase: 02-company-access-and-tenant-foundation*
*Completed: 2026-06-09*
