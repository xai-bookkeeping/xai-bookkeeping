# Phase 2: Company Access and Tenant Foundation - Research

**Researched:** 2026-06-07
**Status:** Ready for planning

## Research Summary

Phase 2 should keep Clerk as the identity provider, but the implementation plan needs to account for the repo's real deployment shape: the React app and FastAPI app currently run as separate applications on separate local origins (`http://localhost:5173` and `http://localhost:8000`). Clerk's automatic backend cookie flow is straightforward on the same origin, so the safest way to preserve the locked httpOnly-cookie contract is to make the browser talk to a same-origin `/api` path and proxy that path to FastAPI in development and production.

The safest planning posture for this repo is:

1. Keep Clerk as the browser/session authority.
2. Keep Clerk session transport in httpOnly cookies instead of teaching frontend JS to read bearer tokens.
3. Verify Clerk session state in FastAPI with the official Python SDK.
4. Mirror users, organizations, and memberships into Postgres through verified Clerk webhooks.
5. Enforce company access in the backend from both the active organization context and the mirrored membership rows.
6. Clear frontend cached data immediately after company switching so records from the previous company never remain visible.

## Key Findings

### 1. Auth transport is the main implementation risk

Clerk's backend request docs note that automatic session-token passing happens when the client and server share an origin. The same docs show the explicit `Authorization: Bearer <token>` pattern for cross-origin requests. That matters here because Phase 1 already established a split frontend/backend app boundary, and the current code/config point at separate local ports.

Planning implication:

- Treat browser-to-API auth as an explicit contract.
- Preserve the locked httpOnly-cookie decision by routing frontend API calls through a same-origin `/api` path.
- Add a Vite dev proxy now and assume a production reverse proxy or ingress does the same job later.
- Do not scatter ad hoc token handling through route components or fetch calls.

This keeps the current split-app architecture intact while preserving the stronger cookie-only session posture from the phase context.

### 2. Clerk Organizations fit the company model well

Clerk's Organizations docs support the exact workspace pattern this phase needs: users can belong to multiple organizations, switch the active organization, and protect routes based on role/permission checks. The docs also show two useful paths:

- Built-in `<OrganizationSwitcher />` for fast setup.
- Custom switchers with `useOrganizationList()` plus `setActive({ organization })`.

The approved Phase 2 UI contract already expects a custom company switcher in the app header, so the plan should use the custom-flow path rather than dropping in the default Clerk widget.

### 3. Organization switching has a transient loading state that the UI must respect

Clerk's React docs for `useOrganization()` note that loading can flip back to `false` while auth state is updating, including during organization switching. That reinforces the Phase 2 context decision to show an explicit switching state and clear TanStack Query cache immediately after `setActive(...)` succeeds.

Planning implication:

- While a company switch is in flight, the UI must stop rendering the previous company's scoped data.
- The switcher should disable interaction, show "Switching company...", and replace scoped content with a loading state until the new organization is active.

### 4. FastAPI should use official Clerk token verification, not a homegrown JWT layer

Clerk's official Python backend package on PyPI is `clerk-backend-api`, and the current release listed there is `5.0.7` uploaded on 2026-05-29. The Clerk Python backend article and SDK docs align on the basic model:

- Frontend gets a Clerk session token.
- Backend verifies it.
- Backend reads claims and authorizes the request.

Planning implication:

- Add `clerk-backend-api` to the backend dependencies.
- Add Clerk env vars to settings: publishable key, secret key, webhook signing secret, JWT key, and authorized parties/origins.
- Verify only `session_token` on user-driven company routes.
- Centralize verification in one FastAPI dependency so later phases reuse the same path.

### 5. Shadow tables plus webhooks are still the right local-data strategy

Clerk's webhook docs recommend handling external events through signed webhook POSTs, and explicitly note that webhook signatures should be verified. Because XAI Books needs database joins, reporting, tenant checks, and audit trails, the local Postgres mirror from the phase context remains the right architecture:

- `users`
- `companies`
- `company_memberships`

Planning implication:

- Do not fetch organization membership live from Clerk on every business request.
- Use webhooks to upsert local rows and make the database the source used by domain code.
- Treat webhook verification as mandatory, not optional hardening.

### 6. Async SQLAlchemy is a real phase concern, not cleanup work

The current backend session layer is synchronous (`Engine`, `Session`, `create_engine`) and the Alembic env imports the same sync engine builder. SQLAlchemy's async docs recommend `create_async_engine(...)` and `async_sessionmaker(...)` for async request lifecycles.

Planning implication:

- Phase 2 needs to convert request-time database access to `AsyncSession`.
- The plan should update both runtime sessions and migration wiring deliberately, not as a side effect of adding auth.
- This belongs in the first plan because every later company/permission route depends on the session layer.

### 7. Audit events need same-transaction writes

The context decision to write audit events in the same transaction as the business change still holds up. Phase 2 especially needs this because the audited actions are security-relevant: login-related actions, invites, role changes, and company settings.

Planning implication:

- Build a reusable audit write helper/service, not one-off inserts per route.
- Company scoping must be part of the audit row, and audit reads must also pass through the same tenant guard path as the source records.

## Recommended Implementation Direction

### Backend

- Introduce `clerk-backend-api` and `asyncpg`.
- Convert the DB session layer to `AsyncSession`.
- Add a single auth dependency that:
  - verifies Clerk session tokens
  - enforces `authorized_parties`
  - exposes Clerk user ID and active organization ID
- Mirror Clerk users/organizations/memberships into Postgres through verified webhooks.
- Enforce tenant access with one reusable `get_current_company` dependency on `/api/v1/companies/{company_id}/...` routes.
- Add fixed role and permission infrastructure locally so the backend remains the real authorization authority even if Clerk carries role metadata.

### Frontend

- Add `@clerk/clerk-react`.
- Wrap the app with `ClerkProvider`.
- Add protected route handling for signed-in vs signed-out flows.
- Add a same-origin `/api` base path contract and Vite proxy so Clerk session cookies reach FastAPI without exposing tokens to frontend JS.
- Build a custom company switcher with `useOrganizationList()` and `setActive(...)`.
- Keep generated API client usage behind the same-origin `/api` contract rather than a JS token helper.
- Clear TanStack Query cache after company switching and handle the loading window explicitly.

### Data Model

- `users`: local mirror keyed by Clerk user ID.
- `companies`: local mirror keyed by Clerk organization ID, including UAE defaults required by Phase 2.
- `company_memberships`: local mirror of user-to-company access with role and status.
- `role_permissions`: fixed-role mapping for backend authorization checks.
- `audit_events`: append-only company-scoped log with before/after JSONB change detail.

## Risks To Encode In The Plan

### R-01: Split-origin assumptions can break auth silently

If the implementation points the frontend directly at the backend origin without a same-origin proxy, protected routes may appear signed in on the frontend while the backend still sees anonymous requests.

Mitigation:

- Plan a same-origin `/api` contract with a Vite dev proxy and production reverse proxy assumption.
- Add backend tests for missing/invalid authenticated request state and frontend tests that confirm protected routes only work through the same-origin API path.

### R-02: Stale company data can leak visually after switching organizations

If the switcher updates auth state but keeps old query cache alive, the user can momentarily see records from the previous company.

Mitigation:

- Clear query cache on successful `setActive(...)`.
- Disable the switcher during transition.
- Add a frontend test that confirms old scoped data is removed before new data loads.

### R-03: Role checks can drift if only the UI enforces them

Frontend route guards alone are not enough for COMP-05 and AUTH-04.

Mitigation:

- Put permission checks in FastAPI dependencies and route handlers.
- Add explicit negative tests for viewer/accountant/admin/owner behavior.

### R-04: Webhook sync drift can break shadow-table trust

If membership removals or org updates do not land in Postgres, backend authorization can become stale.

Mitigation:

- Verify webhook signatures.
- Upsert idempotently.
- Cover create/update/delete membership transitions in tests.

## Planning Shape

The roadmap's four-plan split is still the right size, but the order should stay mostly sequential because the later plans reuse the auth/session, company, and permission seams from the earlier ones:

1. `02-01` - backend auth/session foundation, async DB migration, and user webhook sync
2. `02-02` - frontend sign-in shell and same-origin API contract
3. `02-03` - backend company shadow model and tenant guard
4. `02-04` - frontend company switching and tenant shell integration
5. `02-05` - roles, permissions, Clerk-backed invites, and team UI
6. `02-06` - UAE company settings backend plus base audit event model
7. `02-07` - company settings and company-scoped audit UI

This is less parallel than some feature phases, but it lowers merge/conflict risk and keeps the tenant boundary implementation coherent.

## Validation Architecture

Phase 2 should use dual feedback loops:

- Backend: Pytest against protected routes, webhook sync, authorization matrix, and audit writes.
- Frontend: Vitest/Testing Library against auth routing, company switcher, team/role flows, and audit/settings states.

Recommended sampling:

- After every task: targeted backend/frontend test files for the area being changed.
- After every plan: `make test-backend` and `make test-frontend`.
- Before verification: full backend and frontend suites green, plus at least one manual real-Clerk smoke test for sign-in and org switching.

The fastest failure signals for this phase are:

- 401/403 contract tests in backend
- cache-clearing company-switch tests in frontend
- migration/app-start smoke checks after the async DB conversion

## Sources

- [Clerk Organizations getting started](https://clerk.com/docs/react/guides/organizations/getting-started)
- [Clerk custom organization switcher flow](https://clerk.com/docs/guides/development/custom-flows/organizations/organization-switcher)
- [Clerk `useOrganization()` React reference](https://clerk.com/docs/react/reference/hooks/use-organization)
- [Clerk `setActive()` params](https://clerk.com/docs/react/reference/types/set-active-params)
- [Clerk backend request auth / making requests](https://clerk.com/docs/guides/development/making-requests)
- [Clerk manual JWT verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification)
- [Clerk webhooks overview](https://clerk.com/docs/guides/development/webhooks/overview)
- [Clerk Python backend SDK on PyPI](https://pypi.org/project/clerk-backend-api/)
- [SQLAlchemy async ORM documentation](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)

---

*Phase: 2-Company Access and Tenant Foundation*
*Research completed: 2026-06-07*
