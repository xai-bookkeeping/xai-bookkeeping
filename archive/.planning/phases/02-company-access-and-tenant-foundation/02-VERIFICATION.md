---
phase: 02-company-access-and-tenant-foundation
verified: 2026-06-09T07:11:08Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Sign in with a real existing Clerk user and land in an authorized workspace"
    expected: "The user sees the owner-first sign-in screen, authenticates, follows the product-owned post-auth path, and lands in a ready workspace for an authorized company without loops or raw Clerk recovery errors."
    why_human: "The automated frontend suite mocks Clerk state and cannot prove real browser cookie, redirect, and hosted-auth behavior."
  - test: "Create a new account with Google or email, create a company, and wait through readiness handoff"
    expected: "The product keeps the user in company setup until backend readiness completes, then opens the workspace without bouncing back to sign-in or leaving the user on a provider-owned recovery path."
    why_human: "The OAuth/provider journey and first-run webhook/bootstrap timing are simulated in tests rather than exercised against live Clerk."
  - test: "Switch between two real authorized companies after loading company-scoped screens"
    expected: "The switcher updates the active company, clears prior company data, and either lands in the next ready workspace or the setup-handoff state without flashing previous-company records."
    why_human: "The current regression tests use mocked Clerk `setActive(...)` behavior and cannot observe a real session transition in the browser."
  - test: "Run one live admin flow: invite a member, change a role or revoke access, save company settings, and confirm audit history"
    expected: "Authorized roles can complete the action, lower roles see calm denial feedback, and the resulting audit events appear only inside the active company."
    why_human: "This requires real Clerk organization behavior, invite/membership lifecycle, and end-to-end UI confirmation."
---

# Phase 2: Company Access and Tenant Foundation Verification Report

**Phase Goal:** As a company owner or team member, I want to sign in, access only my authorized companies, and manage company membership and settings safely, so that I can operate XAI Books securely without cross-company data leakage.
**Verified:** 2026-06-09T07:11:08Z
**Status:** human_needed
**Re-verification:** No — initial verification

Manual MVP-format check: the Phase 2 goal matches the required `As a..., I want..., so that...` user-story form. The dedicated `gsd-tools` user-story validator subcommand referenced by the verifier instructions is not available in this checkout, so the format check was done directly from the roadmap text.

## User Flow Coverage

| Step | Expected | Evidence | Status |
| --- | --- | --- | --- |
| Open the app while signed out | The user lands on a product-owned sign-in or sign-up screen instead of protected workspace content. | `frontend/src/app/router.tsx:34-49`, `frontend/src/routes/auth/sign-in.tsx:15-115`, `frontend/src/routes/auth/sign-up.tsx:15-110`, `frontend/src/test/auth-routes.test.tsx` sign-in/sign-up route tests | ✓ VERIFIED |
| Authenticate | Successful auth is funneled into one local post-auth decision path. | `frontend/src/main.tsx:22-30`, `frontend/src/app/router.tsx:34-49`, `frontend/src/routes/auth/sign-in.tsx:98-103`, `frontend/src/routes/auth/sign-up.tsx:95-99`, `frontend/src/test/auth-routes.test.tsx:321-361` | ✓ VERIFIED |
| Create or resume company setup | A first-run or no-company user stays in company setup until backend readiness is true. | `frontend/src/routes/auth/create-company.tsx:68-124`, `frontend/src/routes/auth/create-company.tsx:185-251`, `backend/app/api/routes/auth.py:103-153`, `backend/tests/test_auth.py:131-313`, `frontend/src/test/auth-routes.test.tsx:380-470` | ✓ VERIFIED |
| Enter only authorized company context | Same-org pending states are not treated as forbidden, but true foreign-company access is blocked. | `backend/app/platform/company_access.py:78-106`, `backend/app/api/routes/companies.py:19-22`, `backend/tests/test_company_authorization.py:66-199`, `frontend/src/routes/root.tsx:283-308` | ✓ VERIFIED |
| Switch company | An authorized user can switch context without leaving the workspace and without carrying stale data forward. | `frontend/src/components/molecules/company-switcher.tsx:67-105`, `frontend/src/routes/root.tsx:283-308`, `frontend/src/test/company-switcher.test.tsx:252-320` | ✓ VERIFIED |
| Manage membership and roles | Admin-capable users can invite, change roles, revoke invites, and remove members. | `backend/app/api/routes/team.py:145-316`, `frontend/src/routes/workspace/team/index.tsx`, `backend/tests/test_role_permissions.py:290-454`, `frontend/src/test/team-roles.test.tsx` | ✓ VERIFIED |
| Edit company settings and view audit history | Authorized users can update UAE-first settings and review company-scoped audit history. | `backend/app/api/routes/company_settings.py:56-105`, `backend/app/api/routes/audit.py:31-47`, `frontend/src/routes/workspace/settings/index.tsx`, `frontend/src/routes/workspace/audit/index.tsx`, `backend/tests/test_company_settings.py`, `frontend/src/test/company-settings-audit.test.tsx` | ✓ VERIFIED |
| Outcome | The codebase enforces company-private access and company-scoped audit/settings behavior so users can operate without cross-company leakage. | `backend/app/platform/company_access.py:78-106`, `backend/app/platform/permissions.py:22-72`, `backend/app/api/routes/audit.py:31-47`, `backend/tests/test_company_authorization.py`, `backend/tests/test_audit_events.py`, `frontend/src/test/workspace-shell.test.tsx` | ✓ VERIFIED |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | User can sign in, access only authorized companies, and switch company context. | ✓ VERIFIED | Clerk-backed routing and post-auth handoff are wired in `frontend/src/main.tsx:22-30` and `frontend/src/app/router.tsx:34-49`; foreign-company requests fail in `backend/app/platform/company_access.py:78-106`; switching clears client state in `frontend/src/components/molecules/company-switcher.tsx:67-105`; covered by `backend/tests/test_company_authorization.py` and `frontend/src/test/company-switcher.test.tsx`. |
| 2 | Admin can invite users, assign roles, and manage company membership. | ✓ VERIFIED | Clerk-backed team mutations live in `backend/app/api/routes/team.py:145-316`; the Team & Roles UI consumes typed endpoints in `frontend/src/routes/workspace/team/index.tsx`; allow/deny coverage exists in `backend/tests/test_role_permissions.py` and `frontend/src/test/team-roles.test.tsx`. |
| 3 | Company records include AED, TRN, VAT registration status, and 5% VAT default settings. | ✓ VERIFIED | Defaults and fields are defined on `backend/app/db/models/company.py:15-40`, validated in `backend/app/api/routes/company_settings.py:17-53`, rendered in `frontend/src/components/organisms/company-settings-form.tsx`, and asserted in `backend/tests/test_company_settings.py:100-122` plus `frontend/src/test/company-settings-audit.test.tsx`. |
| 4 | Backend rejects cross-company data, setting, and audit access attempts. | ✓ VERIFIED | `backend/app/platform/company_access.py:78-106` returns 403 for true foreign-company access and 409 for same-org materialization lag; `backend/app/api/routes/audit.py:31-47` and `backend/app/api/routes/company_settings.py:71-105` are guarded through permission dependencies; denial paths are asserted in backend and frontend tests. |
| 5 | Important Phase 2 actions create company-scoped audit events with actor, entity, action, timestamp, and change detail. | ✓ VERIFIED | `backend/app/audit/service.py:8-30` writes append-only rows; `backend/app/api/routes/auth.py:67-99`, `backend/app/api/routes/team.py:198-314`, and `backend/app/api/routes/company_settings.py:84-101` emit login, membership, invitation, and settings events; `backend/tests/test_audit_events.py` verifies scoping and payload detail. |
| 6 | First-run authenticated users get deterministic backend readiness states instead of false unauthorized errors. | ✓ VERIFIED | `backend/app/api/routes/auth.py:103-153` returns `no_active_company`, `company_context_pending`, or `ready`; `backend/app/platform/company_access.py:44-106` separates pending from forbidden; `frontend/src/routes/auth/create-company.tsx:68-124` and `frontend/src/routes/root.tsx:283-308` consume the typed contract. |
| 7 | Auth and onboarding screens stay on a product-owned post-auth path until company setup is ready. | ✓ VERIFIED | `frontend/src/main.tsx:22-30`, `frontend/src/app/router.tsx:34-49`, `frontend/src/routes/auth/sign-in.tsx:98-103`, `frontend/src/routes/auth/sign-up.tsx:95-99`, and `frontend/src/routes/auth/create-company.tsx:103-124` keep successful auth on `/create-company` until readiness is `ready`; exercised in `frontend/src/test/auth-routes.test.tsx`. |
| 8 | The workspace shell distinguishes ready, setup pending, true forbidden, auth/bootstrap errors, and company lookup errors. | ✓ VERIFIED | `frontend/src/routes/root.tsx:142-279` renders dedicated bootstrap-error and company-lookup-error states; `frontend/src/routes/root.tsx:283-308` splits ready/setup/forbidden/loading shell states; `frontend/src/test/workspace-shell.test.tsx` covers each branch. |
| 9 | Company switching clears cached data and does not leak previous-company records. | ✓ VERIFIED | `frontend/src/components/molecules/company-switcher.tsx:79-95` calls `setActive(...)` and `queryClient.clear()` with live feedback; `frontend/src/routes/workspace/index.tsx:87-119` shows a loading state while switching; `frontend/src/test/company-switcher.test.tsx` asserts stale query data is removed before the next company view. |
| 10 | Clerk-backed auth still uses same-origin httpOnly-cookie transport rather than JS-readable bearer tokens. | ✓ VERIFIED | The browser client uses `window.location.origin` in `frontend/src/lib/api-runtime.ts:3-8`, Vite proxies `/api` in `frontend/vite.config.ts:15-28`, backend auth only accepts `session_token` in `backend/app/platform/auth.py:21-31`, and `frontend/src/test/auth-routes.test.tsx:481-498` asserts no `Authorization` header is sent. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `backend/app/platform/auth.py` | Clerk-authenticated backend principal resolution | ✓ VERIFIED | Accepts only `session_token`, resolves `clerk_user_id`, `sid`, and `org_id`, and returns 401 on unsigned requests. |
| `backend/app/api/routes/auth.py` | `/api/v1/auth/me`, login audit, and typed bootstrap/readiness contract | ✓ VERIFIED | Exposes `AuthBootstrapResponse`, records one `auth.login_success` event per session, and materializes company context from Clerk snapshots. |
| `backend/app/platform/company_access.py` | Reusable tenant guard for company-scoped routes | ✓ VERIFIED | Fails foreign-company access with 403, same-org missing local rows with 409, and returns full company access context when ready. |
| `backend/app/platform/permissions.py` | Fixed-role permission foundation | ✓ VERIFIED | Seeds and resolves `users:*`, `settings:update`, `audit:view`, `records:*`, and `reports:*` permissions for owner/admin/accountant/viewer roles. |
| `backend/app/api/routes/team.py` + `frontend/src/routes/workspace/team/index.tsx` | Team membership invite/role/remove flow | ✓ VERIFIED | Backend mutations call Clerk and write audit rows; frontend renders typed company-scoped member and invite states. |
| `backend/app/api/routes/company_settings.py` + `frontend/src/routes/workspace/settings/index.tsx` | UAE-first company settings flow | ✓ VERIFIED | Backend validates TRN and stores VAT/currency defaults; frontend renders editable legal/activity/TRN/VAT fields plus read-only AED/5% defaults. |
| `backend/app/api/routes/audit.py` + `frontend/src/routes/workspace/audit/index.tsx` | Company-scoped audit history | ✓ VERIFIED | Audit route filters by `company_id` and permission; frontend renders populated, empty, and denied states. |
| `frontend/src/lib/clerk.ts` | Local Clerk adapter for product-owned auth surfaces | ✓ VERIFIED | Re-exports provider/auth primitives and local `SignedIn`/`SignedOut` wrappers used by sign-in/sign-up/create-company routing. |
| `frontend/src/routes/auth/create-company.tsx` | Product-owned setup and readiness handoff | ✓ VERIFIED | Company creation stays on setup while bootstrap polls `company_context_pending` and handles auth/server failures explicitly. |
| `frontend/src/routes/root.tsx` | Readiness-aware workspace shell | ✓ VERIFIED | Separate bootstrap error, company lookup error, setup handoff, forbidden, loading, and ready branches exist. |
| `frontend/src/components/molecules/company-switcher.tsx` | Cache-safe company switching | ✓ VERIFIED | Switches organizations, clears query cache, exposes add-company path, and announces status feedback. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Clerk browser cookie | FastAPI auth dependency | `authenticate_request(... accepts_token=[\"session_token\"])` | ✓ WIRED | `backend/app/platform/auth.py:21-31` and `:47-69` tie Clerk session cookies to backend authorization state. |
| `/api/v1/auth/bootstrap` | Active Clerk organization snapshot | `ClerkOrganizationClient.get_principal_company_snapshot(...)` | ✓ WIRED | `backend/app/api/routes/auth.py:103-153` reconciles only the authenticated principal's active org and reuses webhook-style materialization. |
| Company path param | Tenant guard | `get_company_access_context()` | ✓ WIRED | `backend/app/api/routes/companies.py:19-22`, `backend/app/api/routes/team.py`, `backend/app/api/routes/company_settings.py`, and `backend/app/api/routes/audit.py` all depend on company access context or permission context derived from it. |
| Fixed role rows | Backend enforcement | `require_company_permission(...)` | ✓ WIRED | Team, settings, and audit routes are guarded by explicit permission dependencies backed by `role_permissions` rows. |
| Auth redirects | Product-owned setup path | `/create-company` fallback/force redirect | ✓ WIRED | `frontend/src/main.tsx:22-30`, `frontend/src/routes/auth/sign-in.tsx:98-103`, and `frontend/src/routes/auth/sign-up.tsx:95-99` keep Clerk success paths inside local routing. |
| Create-company UI | Backend readiness contract | `getAuthBootstrapApiV1AuthBootstrapGet(...)` | ✓ WIRED | `frontend/src/routes/auth/create-company.tsx:68-124` polls the generated bootstrap client and navigates to `/workspace` only on `ready`. |
| Root shell | Distinct ready/pending/forbidden/error states | `bootstrapQuery` + `activeCompanyQuery` | ✓ WIRED | `frontend/src/routes/root.tsx:142-308` separates auth-required, retryable readiness, retryable company lookup, setup, forbidden, and ready branches. |
| Company switcher | Cache clearing | `setActive(...)` + `queryClient.clear()` | ✓ WIRED | `frontend/src/components/molecules/company-switcher.tsx:79-95` preserves cache clearing and feedback under the readiness-aware shell. |
| Runtime auth files | Local Clerk adapter | `@/lib/clerk` imports | ⚠ PARTIAL | `frontend/src/routes/auth/sign-in.tsx`, `sign-up.tsx`, `create-company.tsx`, `app/router.tsx`, and `main.tsx` use `@/lib/clerk`, but `frontend/src/routes/root.tsx:2` and `frontend/src/components/molecules/company-switcher.tsx:2` still import hooks directly from `@clerk/react`. User-facing auth behavior is intact, but adapter consolidation is incomplete. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `frontend/src/routes/auth/create-company.tsx` | `bootstrapQuery.data.status` | `GET /api/v1/auth/bootstrap` -> Clerk snapshot + local shadow rows in `backend/app/api/routes/auth.py` | Yes | ✓ FLOWING |
| `frontend/src/routes/root.tsx` | `bootstrapQuery.data`, `activeCompanyQuery.data` | `GET /api/v1/auth/bootstrap` and `GET /api/v1/companies/{company_id}` | Yes | ✓ FLOWING |
| `frontend/src/routes/workspace/team/index.tsx` | `teamQuery.data` | `GET /api/v1/companies/{company_id}/team` -> local members + Clerk pending invites | Yes | ✓ FLOWING |
| `frontend/src/routes/workspace/settings/index.tsx` | `settingsQuery.data` | `GET /api/v1/companies/{company_id}/settings` -> `companies` row | Yes | ✓ FLOWING |
| `frontend/src/routes/workspace/audit/index.tsx` | `auditQuery.data.events` | `GET /api/v1/companies/{company_id}/audit-events` -> `audit_events` rows | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Backend auth, tenant, permission, audit, and settings contract | `rtk docker compose run --rm backend pytest -q tests/test_auth.py tests/test_company_authorization.py tests/test_role_permissions.py tests/test_audit_events.py tests/test_company_settings.py` | `32 passed`; one non-blocking `StarletteDeprecationWarning` from `fastapi.testclient`/`httpx` | ✓ PASS |
| Frontend auth, shell, switcher, team, settings, and audit contract | `rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/auth-routes.test.tsx src/test/workspace-shell.test.tsx src/test/company-switcher.test.tsx src/test/team-roles.test.tsx src/test/company-settings-audit.test.tsx` | `5` files, `29` tests passed; only React Router future-flag warnings | ✓ PASS |
| Schema drift for Phase 02 | `rtk bash -lc 'node .codex/get-shit-done/bin/gsd-tools.cjs verify schema-drift 02'` | `drift_detected=false` | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| None declared | — | No phase-declared or conventional `scripts/**/tests/probe-*.sh` files were found for Phase 02 | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `AUTH-01` | `02-01`, `02-02`, `02-08`, `02-09` | User can securely sign in. | ✓ SATISFIED | Clerk-backed route protection and backend 401 handling exist in `backend/app/platform/auth.py`, `frontend/src/main.tsx`, `frontend/src/app/router.tsx`, and `frontend/src/test/auth-routes.test.tsx`. |
| `AUTH-02` | `02-05` | Admin can invite and manage users. | ✓ SATISFIED | Invite/revoke/remove routes in `backend/app/api/routes/team.py` and typed Team & Roles UI in `frontend/src/routes/workspace/team/index.tsx` are covered by backend/frontend tests. |
| `AUTH-03` | `02-05` | Admin can assign users to company roles. | ✓ SATISFIED | Role updates flow through `PATCH /api/v1/companies/{company_id}/team/members/{clerk_user_id}` and the role selector UI; covered by `backend/tests/test_role_permissions.py` and `frontend/src/test/team-roles.test.tsx`. |
| `AUTH-04` | `02-05`, `02-06`, `02-07` | Role-based permissions control access to viewing, creating, editing, approving, deleting, exporting, and configuring records. | ✓ SATISFIED | `backend/app/platform/permissions.py` seeds `records:*`, `reports:*`, `settings:update`, `audit:view`, and `users:*`; `backend/tests/test_role_permissions.py` proves allow/deny enforcement on the Phase 2 surfaces that currently exist. |
| `AUTH-05` | `02-01`, `02-02`, `02-08`, `02-10` | User session handling prevents unauthorized access to company finance data. | ✓ SATISFIED | Backend accepts only Clerk session tokens; frontend uses same-origin cookie transport and company access guards instead of JS bearer tokens. |
| `COMP-01` | `02-03`, `02-08` | User can belong to more than one company. | ✓ SATISFIED | Local `company_memberships` exist, Clerk membership sync is implemented, and the switcher consumes `useOrganizationList()` memberships. |
| `COMP-02` | `02-04`, `02-10` | User can switch between companies they are authorized to access. | ✓ SATISFIED | `frontend/src/components/molecules/company-switcher.tsx` switches orgs and `frontend/src/test/company-switcher.test.tsx` covers ready and pending destinations. |
| `COMP-03` | `02-03`, `02-08` | Each company's business data is private from every other company. | ✓ SATISFIED | `backend/app/platform/company_access.py` enforces company alignment and membership readiness before route execution; negative authorization tests cover foreign-company access. |
| `COMP-04` | `02-03`, `02-04`, `02-06`, `02-07`, `02-10` | Company-scoped files, reports, dashboards, settings, and audit events cannot be accessed by users outside that company. | ✓ SATISFIED | Current Phase 2 company-scoped surfaces (`/companies/{id}`, settings, audit, team, workspace shell) are all guarded by company access and permission checks; no file/report endpoints exist yet in this codebase. |
| `COMP-05` | `02-03`, `02-08`, `02-10` | Cross-company access attempts are rejected by backend authorization, not only hidden in the UI. | ✓ SATISFIED | `backend/tests/test_company_authorization.py` proves a foreign-company request returns 403 before company lookup. |
| `SETUP-01` | `02-02`, `02-03`, `02-06`, `02-07`, `02-09`, `02-10` | Admin can create and edit company profile details. | ✓ SATISFIED | Company creation is in `frontend/src/routes/auth/create-company.tsx`; company profile editing is in backend settings routes and frontend company settings UI. |
| `SETUP-02` | `02-06`, `02-07` | Company profile supports AED currency as the default Phase 1 currency. | ✓ SATISFIED | `backend/app/db/models/company.py:29-34` defaults `default_currency` to `AED`; surfaced in settings UI and backend/frontend tests. |
| `SETUP-03` | `02-06`, `02-07` | Company profile supports UAE TRN fields. | ✓ SATISFIED | `backend/app/api/routes/company_settings.py:17-53` validates a 15-digit TRN and the settings UI exposes the field; invalid TRNs return 422 in tests. |
| `SETUP-04` | `02-06`, `02-07` | Company settings support UAE VAT registration status and 5% VAT default. | ✓ SATISFIED | `backend/app/db/models/company.py:21-39` and `frontend/src/components/organisms/company-settings-form.tsx` expose VAT registration status plus read-only `5.00%` default VAT. |
| `AUDT-01` | `02-06` | System records activity/audit events for important create, update, delete, approval, payment, configuration, permission, and login-related actions. | ✓ SATISFIED | Login, invite, role change, invite revoke, member removal, and company settings updates all emit audit rows. |
| `AUDT-02` | `02-06` | Audit events include actor, company, entity, action, timestamp, and meaningful change details. | ✓ SATISFIED | `backend/app/db/models/audit_event.py` stores actor/company/entity/action/timestamp and JSON before/after detail; tests assert payload contents. |
| `AUDT-04` | `02-06`, `02-07` | Audit history is company-scoped and inaccessible to unauthorized users. | ✓ SATISFIED | `backend/app/api/routes/audit.py` filters by `company_id` and `audit:view`; backend/frontend tests cover company scoping and denied audit access. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `frontend/src/routes/root.tsx` | `2` | Direct `@clerk/react` hook import bypasses the local Clerk adapter introduced in `02-09`. | ⚠ Warning | The auth-routing hardening is functionally in place, but adapter consolidation is only partial in the runtime shell. |
| `frontend/src/components/molecules/company-switcher.tsx` | `2` | Direct `@clerk/react` hook import bypasses the local Clerk adapter. | ⚠ Warning | Future Clerk hook API drift could fragment runtime auth behavior again outside the adapter surface. |
| `.planning/REQUIREMENTS.md` | `191-203`, `241-244` | Traceability rows still mark several implemented Phase 2 requirements as `Pending`. | ℹ Info | Documentation status lags the code evidence verified in this report; product behavior is present, but traceability metadata is stale. |

### Human Verification Required

#### 1. Existing User Sign-In

**Test:** Open the app and sign in with a real Clerk user who already belongs to a ready company.
**Expected:** The user sees the owner-first auth shell, signs in successfully, follows the product-owned post-auth path, and lands in the ready workspace for the authorized company without loops or raw Clerk recovery copy.
**Why human:** The automated suite mocks Clerk state and cannot prove real redirect, cookie, or hosted-auth behavior.

#### 2. First-Time OAuth Or Email Onboarding

**Test:** Start from a new account, use Google or email sign-up, create a company, and stay on the setup flow until the workspace opens.
**Expected:** The user remains on company setup or setup handoff until backend readiness is `ready`; the app does not bounce back to sign-in or jump into workspace early.
**Why human:** Real provider behavior and first-run webhook/bootstrap timing are external-service flows, not mocked unit behavior.

#### 3. Authorized Company Switching

**Test:** Load company-scoped screens for one real company, then switch to a second authorized company from the header switcher.
**Expected:** The switcher shows progress, previous-company data does not flash, and the destination lands in either a ready workspace or the setup-handoff state.
**Why human:** The tests mock `setActive(...)`; only a live browser session can confirm the UX across real Clerk organization switching.

#### 4. Live Admin Membership, Settings, And Audit Flow

**Test:** As an owner or admin, invite a member, change a role or revoke access, save a company-settings change, and then review the audit log.
**Expected:** Allowed actions succeed, denied actions stay denied for lower roles, and the corresponding audit entries appear only for the active company.
**Why human:** This requires real Clerk organization behavior, live membership lifecycle changes, and end-to-end UI confirmation.

### Gaps Summary

No blocking implementation gaps were found in the codebase for the Phase 02 goal. Backend tenant/auth/audit wiring, frontend onboarding/shell/switching behavior, and the focused executable suites all support the intended outcome.

The remaining work is human UAT of real Clerk/OAuth/session behavior and final UI-flow confirmation. One non-blocking warning remains: Clerk adapter consolidation is partial because `root.tsx` and `company-switcher.tsx` still import hooks directly from `@clerk/react`.

---

_Verified: 2026-06-09T07:11:08Z_
_Verifier: the agent (gsd-verifier)_
