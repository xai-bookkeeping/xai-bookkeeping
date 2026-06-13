---
phase: 02
slug: company-access-and-tenant-foundation
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-07
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Pytest 9.0.3 + Vitest 4.1.8 |
| **Config file** | `backend/pyproject.toml`, `frontend/package.json` |
| **Quick per-task loop** | Run the exact automated command from the Per-Task Verification Map for the active task; each targeted loop must complete in `<=30 seconds`. |
| **Wave-level sampling command** | `rtk docker compose run --rm backend pytest -q tests/test_auth.py tests/test_company_authorization.py tests/test_role_permissions.py tests/test_audit_events.py && rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx src/test/workspace-shell.test.tsx src/test/company-switcher.test.tsx` |
| **Full suite command** | `rtk make test-backend && rtk make test-frontend` |
| **Estimated runtime** | Per-task loop `<=30 seconds`; wave-level sample `~40 seconds` |

---

## Sampling Rate

- **After every task commit:** Run the exact per-task command from the map below for the task being changed.
- **After every plan wave:** Run the wave-level sampling command from the Test Infrastructure table.
- **Before `$gsd-verify-work`:** Run `rtk make test-backend && rtk make test-frontend`.
- **Max feedback latency:** `<=30 seconds` per task; `~40 seconds` only for the wave-level sample.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01, AUTH-05 | T-02-01, T-02-03 | Async auth/session groundwork rejects unauthenticated requests with 401 and preserves the async DB path needed for protected routes. | integration | `rtk docker compose run --rm backend pytest -q tests/test_auth.py` | `backend/tests/test_auth.py` | ✅ green |
| 02-01-02 | 01 | 1 | AUTH-01, AUTH-05 | T-02-02 | Verified Clerk user lifecycle webhooks sync local user shadow rows and stay migration-compatible. | integration | `rtk docker compose run --rm backend pytest -q tests/test_auth.py && rtk docker compose run --rm backend alembic upgrade head` | `backend/tests/test_auth.py` | ✅ green |
| 02-02-01 | 02 | 2 | AUTH-01, AUTH-05, SETUP-01 | T-02-05 | Signed-out users are routed into sign-in, and authenticated users without an active company land in the Clerk-backed company-creation handoff instead of a dead-end shell. | component | `rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx` | `frontend/src/test/auth-routes.test.tsx` | ✅ green |
| 02-02-02 | 02 | 2 | AUTH-05 | T-02-04 | Frontend auth routes keep the same-origin `/api` contract and generated client workflow instead of JS-readable token helpers. | component | `rtk make gen-types && rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx` | `frontend/src/test/auth-routes.test.tsx` | ✅ green |
| 02-03-01 | 03 | 3 | COMP-01, COMP-03, COMP-04, COMP-05, SETUP-01 | T-02-06, T-02-07 | Clerk organization and membership mirrors bootstrap the active company locally and return 403 for foreign-company access while staying migration-compatible. | integration | `rtk docker compose run --rm backend pytest -q tests/test_company_authorization.py && rtk docker compose run --rm backend alembic upgrade head` | `backend/tests/test_company_authorization.py` | ✅ green |
| 02-04-01 | 04 | 4 | COMP-02, COMP-04, SETUP-01 | T-02-08 | Company switching and add-company UI clear stale scoped data before the next company renders and continue using generated company-scoped clients. | component | `rtk make gen-types && rtk docker compose run --rm frontend npm run test -- --run src/test/company-switcher.test.tsx` | `frontend/src/test/company-switcher.test.tsx` | ✅ green |
| 02-05-01 | 05 | 5 | AUTH-04 | T-02-09 | The fixed permission matrix enforces allow and deny behavior for team, settings, and audit actions while staying migration-compatible. | integration | `rtk docker compose run --rm backend pytest -q tests/test_role_permissions.py && rtk docker compose run --rm backend alembic upgrade head` | `backend/tests/test_role_permissions.py` | ✅ green |
| 02-05-02 | 05 | 5 | AUTH-02, AUTH-03, AUTH-04 | T-02-10 | Clerk-backed invite, revoke, role-change, and member-removal routes stay limited to authorized admins and owners and remain webhook-driven mirrors locally. | integration | `rtk docker compose run --rm backend pytest -q tests/test_role_permissions.py` | `backend/tests/test_role_permissions.py` | ✅ green |
| 02-05-03 | 05 | 5 | AUTH-02, AUTH-03, AUTH-04 | T-02-09, T-02-10 | Team UI surfaces invite, revoke, role-change, member-removal, and denied-action states on regenerated typed endpoints. | component | `rtk make gen-types && rtk docker compose run --rm frontend npm run test -- --run src/test/team-roles.test.tsx` | `frontend/src/test/team-roles.test.tsx` | ✅ green |
| 02-06-01 | 06 | 6 | AUDT-01, AUDT-02, AUDT-04 | T-02-11 | Audit rows are written atomically with Phase 2 auth and team mutations, remain company-scoped, and stay migration-compatible. | integration | `rtk docker compose run --rm backend pytest -q tests/test_audit_events.py && rtk docker compose run --rm backend alembic upgrade head` | `backend/tests/test_audit_events.py` | ✅ green |
| 02-06-02 | 06 | 6 | SETUP-01, SETUP-02, SETUP-03, SETUP-04, AUTH-04 | T-02-12 | UAE company settings validate AED/TRN/VAT fields, enforce role-based access, and emit audit rows on change. | integration | `rtk docker compose run --rm backend pytest -q tests/test_company_settings.py tests/test_audit_events.py` | `backend/tests/test_company_settings.py`, `backend/tests/test_audit_events.py` | ✅ green |
| 02-07-01 | 07 | 7 | SETUP-01, SETUP-02, SETUP-03, SETUP-04, AUTH-04 | T-02-13 | The settings screen renders the UAE-first company form on regenerated typed endpoints and surfaces save, validation, and denied-access states. | component | `rtk make gen-types && rtk docker compose run --rm frontend npm run test -- --run src/test/company-settings-audit.test.tsx` | `frontend/src/test/company-settings-audit.test.tsx` | ✅ green |
| 02-07-02 | 07 | 7 | AUDT-04, AUTH-04 | T-02-13 | The audit screen renders empty, populated, and denied company-scoped audit-history states on regenerated typed endpoints. | component | `rtk make gen-types && rtk docker compose run --rm frontend npm run test -- --run src/test/company-settings-audit.test.tsx` | `frontend/src/test/company-settings-audit.test.tsx` | ✅ green |
| 02-08-01 | 08 | 8 | AUTH-01, AUTH-05, COMP-01, COMP-05 | T-02-08-01, T-02-08-02 | Auth bootstrap returns only authenticated-principal readiness states and preserves setup-pending vs. true forbidden company access. | integration | `rtk docker compose run --rm backend pytest -q tests/test_auth.py tests/test_company_authorization.py tests/test_role_permissions.py tests/test_audit_events.py` | `backend/tests/test_auth.py`, `backend/tests/test_company_authorization.py`, `backend/tests/test_role_permissions.py`, `backend/tests/test_audit_events.py` | ✅ green |
| 02-08-02 | 08 | 8 | COMP-03, COMP-05, AUTH-04, AUDT-01, AUDT-04 | T-02-08-03 | Shared Clerk helper changes do not regress tenant, role-permission, or audit-event behavior across the backend regression suite. | integration | `rtk docker compose run --rm backend pytest -q tests/test_auth.py tests/test_company_authorization.py tests/test_role_permissions.py tests/test_audit_events.py` | `backend/tests/test_auth.py`, `backend/tests/test_company_authorization.py`, `backend/tests/test_role_permissions.py`, `backend/tests/test_audit_events.py` | ✅ green |
| 02-09-01 | 09 | 9 | AUTH-01, AUTH-05 | T-02-09-01 | The local Clerk adapter, callback handling, and single post-auth routing path remove blank-page and redirect-loop regressions while consuming the generated bootstrap contract. | component | `rtk make gen-types && rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx` | `frontend/src/test/auth-routes.test.tsx` | ✅ green |
| 02-09-02 | 09 | 9 | AUTH-01, SETUP-01 | T-02-09-02 | Missing-account OAuth attempts continue into account creation and company setup with owner-first copy, and setup does not auto-jump to workspace while readiness is pending. | component | `rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx` | `frontend/src/test/auth-routes.test.tsx` | ✅ green |
| 02-10-01 | 10 | 10 | AUTH-05, COMP-04, COMP-05, SETUP-01 | T-02-10-01 | The authenticated shell renders distinct ready, setup-pending, and forbidden company states instead of collapsing them into one access error. | component | `rtk docker compose run --rm frontend npm run test -- --run src/test/workspace-shell.test.tsx src/test/company-switcher.test.tsx` | `frontend/src/test/workspace-shell.test.tsx`, `frontend/src/test/company-switcher.test.tsx` | ✅ green |
| 02-10-02 | 10 | 10 | COMP-02, COMP-04 | T-02-10-02 | Company switching still clears stale company data before the next company renders, including when the next company enters setup-pending handoff. | component | `rtk docker compose run --rm frontend npm run test -- --run src/test/workspace-shell.test.tsx src/test/company-switcher.test.tsx` | `frontend/src/test/workspace-shell.test.tsx`, `frontend/src/test/company-switcher.test.tsx` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers the phase:

- [x] Pytest and Vitest are already installed and wired
- [x] Docker Compose test entry points already exist (`rtk make test-backend`, `rtk make test-frontend`)
- [x] New phase-specific test files are created in their owning plans before the first targeted run

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Clerk sign-in round trip | AUTH-01 | Mocked tests cannot prove Clerk dashboard/app-key wiring. | Start the stack, sign in with a real Clerk development user, and confirm `/workspace` renders only after the app receives a valid session. |
| Real organization switching against Clerk | COMP-02 | Unit tests can mock `setActive(...)`, but they cannot fully prove Clerk-hosted session rotation. | Switch between two real Clerk organizations, confirm the header updates, old company data disappears immediately, and the new company loads without foreign records flashing. |
| Real webhook delivery | COMP-01, AUTH-02 | Local tests can verify signature handling but not dashboard subscription wiring. | Send subscribed Clerk user/org/membership events to the local webhook endpoint and confirm the mirrored Postgres rows update as expected. |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or declared manual-only checks
- [x] Sampling continuity: no three consecutive tasks without automated coverage
- [x] Backend negative tests exist for 401, 403, and role-based denial paths
- [x] Backend bootstrap regressions include `test_role_permissions.py` and `test_audit_events.py` alongside auth and company-access tests
- [x] Frontend company-switch tests explicitly cover cache clearing and loading states
- [x] No watch-mode flags in automated commands
- [x] Per-task feedback latency stays at or under 30 seconds, and the ~40 second combined regression run is reserved for wave-level sampling only
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-09 (reconfirmed after normalizing plans 02-01 through 02-07 to nested `<verify><automated>...</automated></verify>` blocks)

## Validation Audit 2026-06-08

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |
