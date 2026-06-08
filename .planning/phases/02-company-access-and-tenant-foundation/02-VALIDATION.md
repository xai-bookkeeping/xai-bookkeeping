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
| **Quick run command** | `docker compose run --rm backend pytest -q tests/test_auth.py && docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx` |
| **Full suite command** | `make test-backend && make test-frontend` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run the targeted test files for the task being changed.
- **After every plan wave:** Run `make test-backend && make test-frontend`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 25 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01, AUTH-05 | T-02-01 | Invalid or missing Clerk-authenticated request state returns 401 and never produces a DB session principal. | integration | `docker compose run --rm backend pytest -q tests/test_auth.py` | `backend/tests/test_auth.py` | ✅ green |
| 02-01-02 | 01 | 1 | AUTH-01 | T-02-03 | Verified Clerk webhooks upsert local user shadow rows; unsigned payloads are rejected. | integration | `docker compose run --rm backend pytest -q tests/test_auth.py` | `backend/tests/test_auth.py` | ✅ green |
| 02-02-01 | 02 | 2 | AUTH-01, AUTH-05, SETUP-01 | T-02-02 | Signed-out users are redirected to sign-in, empty-company users are redirected into Clerk-backed first-company creation, the UI invokes organization-creation handoff with a safe pending state, and authenticated API calls use the same-origin `/api` contract without exposing Clerk tokens to frontend JS. | component | `docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx` | `frontend/src/test/auth-routes.test.tsx` | ✅ green |
| 02-03-01 | 03 | 3 | COMP-01, COMP-03 | T-02-04 | Mirrored company and membership rows reflect Clerk org access accurately. | integration | `docker compose run --rm backend pytest -q tests/test_company_authorization.py` | `backend/tests/test_company_authorization.py` | ✅ green |
| 02-03-02 | 03 | 3 | COMP-04, COMP-05 | T-02-05 | Cross-company requests to `/api/v1/companies/{company_id}` return 403 and never read foreign-company data. | integration | `docker compose run --rm backend pytest -q tests/test_company_authorization.py` | `backend/tests/test_company_authorization.py` | ✅ green |
| 02-04-01 | 04 | 4 | COMP-02, SETUP-01 | T-02-06 | Company switching clears cached company data and renders a loading state before new records appear, and eligible users can launch add-company creation from the switcher. | component | `docker compose run --rm frontend npm run test -- --run src/test/company-switcher.test.tsx` | `frontend/src/test/company-switcher.test.tsx` | ✅ green |
| 02-05-01 | 05 | 5 | AUTH-04 | T-02-07 | Backend permission checks reject unauthorized role and action access across team, settings, and audit resources. | integration | `docker compose run --rm backend pytest -q tests/test_role_permissions.py` | `backend/tests/test_role_permissions.py` | ✅ green |
| 02-05-02 | 05 | 5 | AUTH-02, AUTH-03 | T-02-08 | Clerk-backed invite, invite-revocation, member-removal, and role-update flows require authorized company admins/owners only and sync through webhooks. | integration | `docker compose run --rm backend pytest -q tests/test_role_permissions.py` | `backend/tests/test_role_permissions.py` | ✅ green |
| 02-05-03 | 05 | 5 | AUTH-02, AUTH-03, AUTH-04 | T-02-09 | Team UI exposes plain-language role semantics and surfaces invite, role-change, member-removal, invite-revocation, and permission-denied states instead of silent failure. | component | `docker compose run --rm frontend npm run test -- --run src/test/team-roles.test.tsx` | `frontend/src/test/team-roles.test.tsx` | ✅ green |
| 02-06-01 | 06 | 6 | AUDT-01, AUDT-02, AUDT-04 | T-02-10 | Audit rows are written in the same transaction, include company scope, cover invite/revoke/role-change/member-removal actions, and cannot be read across companies. | integration | `docker compose run --rm backend pytest -q tests/test_audit_events.py` | `backend/tests/test_audit_events.py` | ✅ green |
| 02-06-02 | 06 | 6 | SETUP-01, SETUP-02, SETUP-03, SETUP-04, AUTH-04 | T-02-11 | Company settings validate AED/TRN/VAT fields server-side, enforce role-based access, and write audit events on change. | integration | `docker compose run --rm backend pytest -q tests/test_company_settings.py tests/test_audit_events.py` | `backend/tests/test_company_settings.py`, `backend/tests/test_audit_events.py` | ✅ green |
| 02-07-01 | 07 | 7 | SETUP-01, SETUP-02, SETUP-03, SETUP-04, AUDT-04, AUTH-04 | T-02-12 | Company settings and audit log screens render company-scoped records, consume typed APIs, and surface permission-denied states correctly. | component | `docker compose run --rm frontend npm run test -- --run src/test/company-settings-audit.test.tsx` | `frontend/src/test/company-settings-audit.test.tsx` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers the phase:

- [x] Pytest and Vitest are already installed and wired
- [x] Docker Compose test entry points already exist (`make test-backend`, `make test-frontend`)
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
- [x] Frontend company-switch tests explicitly cover cache clearing and loading states
- [x] No watch-mode flags in automated commands
- [x] Feedback latency stays under 25 seconds for the targeted quick run
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-08

## Validation Audit 2026-06-08

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |
