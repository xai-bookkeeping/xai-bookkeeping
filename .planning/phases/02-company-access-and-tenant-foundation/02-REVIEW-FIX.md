---
phase: 02-company-access-and-tenant-foundation
fixed_at: 2026-06-09T06:34:09Z
review_path: .planning/phases/02-company-access-and-tenant-foundation/02-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-06-09T06:34:09Z
**Source review:** `.planning/phases/02-company-access-and-tenant-foundation/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

**Verification:**
- Failed once due to environment: `rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx src/test/workspace-shell.test.tsx src/test/company-switcher.test.tsx`
- Failure reason: backend compose service could not bind host port `8000` because it was already allocated.
- Passed: `rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/auth-routes.test.tsx src/test/workspace-shell.test.tsx src/test/company-switcher.test.tsx`
- Result: `3` files, `21` tests passed.
- Integrated on main after the temporary review-fix branch could not fast-forward over pre-existing dirty files.
- Main integration commit: `ca1dd34` (`fix(02): resolve bootstrap review blockers`)

## Fixed Issues

### CR-01: Add-company onboarding can jump back into the previous workspace before the new organization becomes active

**Files modified:** `frontend/src/routes/auth/create-company.tsx`, `frontend/src/test/auth-routes.test.tsx`
**Commit:** `ca1dd34`
**Applied fix:** Deferred add-company bootstrap polling until the newly created organization becomes the active Clerk org, so the flow no longer polls the old org or jumps back into the previous workspace. The existing main-checkout API base alignment was preserved rather than recommitted.

### CR-02: Bootstrap failures are masked as normal setup/loading states instead of auth or transport errors

**Files modified:** `frontend/src/routes/auth/create-company.tsx`, `frontend/src/routes/root.tsx`, `frontend/src/test/auth-routes.test.tsx`, `frontend/src/test/workspace-shell.test.tsx`
**Commit:** `ca1dd34`
**Applied fix:** Added explicit bootstrap auth-required and retryable error states in both the create-company flow and the protected shell, so 401/403 and 5xx/transport failures surface as dedicated states instead of falling through to setup/loading. Added regression coverage for the create-company failure states and the workspace-shell failure states.

### WR-01: The regression suite stops before the failure paths that contain both frontend blockers

**Files modified:** `frontend/src/test/auth-routes.test.tsx`, `frontend/src/test/workspace-shell.test.tsx`, `frontend/src/test/company-switcher.test.tsx`
**Commit:** `ca1dd34`
**Applied fix:** Extended the regression suite to cover the add-company race, bootstrap auth failures, and retryable backend failures so the two blocker paths stay covered.

---

_Fixed: 2026-06-09T06:34:09Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
