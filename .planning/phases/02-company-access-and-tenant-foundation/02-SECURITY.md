---
phase: 02
slug: company-access-and-tenant-foundation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-08
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Identity boundary | Clerk-managed identity is translated into an XAI backend principal before protected routes execute. | Session-authenticated request state, Clerk user ID, active organization ID |
| Webhook ingress boundary | Public webhook requests must be verified before they can mutate local user, company, or membership mirrors. | Svix-signed Clerk event payloads, shadow-row lifecycle state |
| Async data-access boundary | Request-time database access must stay async so auth and company-guard flows do not block the backend event loop. | Protected route reads and writes against PostgreSQL |
| Browser transport boundary | Frontend-authenticated traffic must stay on same-origin `/api` routes so Clerk cookies remain `httpOnly`. | Browser session cookies, generated API requests |
| Tenant boundary | Active organization context and requested `company_id` must match an active local membership. | Company-scoped reads, writes, and route authorization |
| Frontend company-switch boundary | Company changes must clear stale client state before new company data renders. | Cached company-scoped query data, loading and denied UI states |
| Permission boundary | Role-based permissions are enforced on top of tenant access for team, settings, and audit resources. | Membership role, permission rows, protected company actions |
| Audit boundary | Mutations that affect company state must emit company-scoped audit events in the same transaction. | Before/after change state, actor, company scope, session context |
| Settings and audit UI boundary | Company settings and audit history must only render from generated company-scoped endpoints and show denied states explicitly. | UAE settings data, audit-event history, permission errors |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Spoofing | Protected FastAPI auth dependency | mitigate | `backend/app/platform/auth.py` accepts only Clerk `session_token` request state and rejects missing or invalid state with `401`; verified by `backend/tests/test_auth.py`. | closed |
| T-02-02 | Tampering | Clerk user webhook ingestion | mitigate | `backend/app/platform/webhooks.py` verifies Svix signatures before any mutation and keeps user shadow-row sync idempotent across create, update, and delete events; verified by `backend/tests/test_auth.py`. | closed |
| T-02-03 | Denial of Service | Backend DB/session layer | mitigate | `backend/app/db/session.py` uses async engine and session factories for request-scoped DB access while preserving sync migration paths; exercised by the Phase 2 backend auth suite in `backend/tests/test_auth.py`. | closed |
| T-02-04 | Information Disclosure | Frontend auth transport | mitigate | `frontend/src/lib/api-runtime.ts` pins the generated client to same-origin `/api`, and `frontend/vite.config.ts` proxies `/api` in development; verified by `frontend/src/test/auth-routes.test.tsx` asserting no bearer token helper is used. | closed |
| T-02-05 | Spoofing | Protected frontend routes | mitigate | `frontend/src/app/router.tsx` gates workspace routes behind Clerk signed-in state and routes signed-out users to `/sign-in`; verified by `frontend/src/test/auth-routes.test.tsx`. | closed |
| T-02-06 | Tampering | Company/membership shadow sync | mitigate | `backend/app/platform/webhooks.py` mirrors organization and membership events idempotently, including update and tombstone flows; verified by `backend/tests/test_company_authorization.py`. | closed |
| T-02-07 | Information Disclosure | Company-scoped backend routes | mitigate | `backend/app/platform/company_access.py` requires active organization alignment plus an active local membership and returns `403` on foreign-company access; verified by `backend/tests/test_company_authorization.py`. | closed |
| T-02-08 | Information Disclosure | Frontend company switching | mitigate | `frontend/src/components/molecules/company-switcher.tsx` clears the React Query cache after `setActive(...)`, and `frontend/src/routes/root.tsx` renders loading and denied states during shell transitions; verified by `frontend/src/test/company-switcher.test.tsx`. | closed |
| T-02-09 | Elevation of Privilege | Backend permission enforcement | mitigate | `backend/app/platform/permissions.py` and `backend/migrations/versions/0004_phase2_permissions.py` seed and enforce explicit permission rows for membership, settings, and audit resources; verified by `backend/tests/test_role_permissions.py`. | closed |
| T-02-10 | Spoofing | Clerk-backed team-management routes | mitigate | `backend/app/api/routes/team.py` routes invite, role-change, removal, and revoke flows through Clerk organization APIs with same-company permission checks instead of local-only mutations; verified by `backend/tests/test_role_permissions.py`. | closed |
| T-02-11 | Repudiation | Audit-event persistence | mitigate | `backend/app/audit/service.py` writes audit rows through the active `AsyncSession`, and `backend/app/api/routes/audit.py` exposes only company-scoped audit reads; verified by `backend/tests/test_audit_events.py`. | closed |
| T-02-12 | Tampering | Company settings and audit access | mitigate | `backend/app/api/routes/company_settings.py` and `backend/app/api/routes/audit.py` require explicit `settings:update` and `audit:view` permissions, with allow/deny coverage in `backend/tests/test_company_settings.py`, `backend/tests/test_role_permissions.py`, and `backend/tests/test_audit_events.py`. | closed |
| T-02-13 | Information Disclosure | Settings and audit UI | mitigate | `frontend/src/routes/workspace/settings/index.tsx` and `frontend/src/routes/workspace/audit/index.tsx` consume generated company-scoped endpoints and surface calm denied states instead of stale or unauthorized data; verified by `frontend/src/test/company-settings-audit.test.tsx`. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Verification Evidence

| Audit Date | Command | Result |
|------------|---------|--------|
| 2026-06-08 | `rtk docker compose run --rm backend pytest -q tests/test_auth.py tests/test_company_authorization.py tests/test_role_permissions.py tests/test_company_settings.py tests/test_audit_events.py` | Passed: 25 tests |
| 2026-06-08 | `rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx src/test/company-switcher.test.tsx src/test/team-roles.test.tsx src/test/company-settings-audit.test.tsx` | Passed: 14 tests |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-08 | 13 | 13 | 0 | Codex via `gsd-secure-phase` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-08
