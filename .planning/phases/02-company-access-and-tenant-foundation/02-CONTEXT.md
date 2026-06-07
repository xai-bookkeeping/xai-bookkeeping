# Phase 2: Company Access and Tenant Foundation - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the secure company-scoped platform foundation: Clerk-backed authentication and session management, multi-company isolation via Clerk Organizations, Postgres shadow tables for users and companies, role-based access control (Owner/Admin/Accountant/Viewer), URL-scoped tenant enforcement, UAE company settings, and base audit events. No business finance features are delivered — only the platform security layer all future phases depend on.

</domain>

<decisions>
## Implementation Decisions

### Authentication
- **D-01:** Use **Clerk** as the authentication provider. Clerk handles user lifecycle, session management, and password/invite flows. Do not build custom auth from scratch.
- **D-02:** Tokens are stored as **httpOnly cookies** — Clerk's default session cookie mechanism. Frontend JS cannot read tokens; XSS cannot steal them.
- **D-03:** Backend uses **async SQLAlchemy with asyncpg** throughout. No synchronous DB drivers. No event loop blocking.

### Multi-Company (Tenant) Model
- **D-04:** Each XAI company maps to a **Clerk Organization**. Clerk Orgs handle company membership, invitations, and org-level metadata.
- **D-05:** Postgres mirrors Clerk data via **Clerk webhooks**: `users` and `companies` shadow tables in Postgres, keyed on Clerk user ID and Clerk org ID. Business data FKs point to local Postgres rows — no Clerk API calls at query time.
- **D-06:** UAE company settings (AED currency, TRN field, VAT registration status, 5% VAT default) are stored as columns on the Postgres `companies` shadow table.

### API Company Context
- **D-07:** All company-scoped API routes use a **URL path prefix**: `/api/v1/companies/{company_id}/...`. Company ID is always explicit in the path.
- **D-08:** A reusable **`get_current_company` FastAPI dependency** reads `company_id` from the path, validates the requesting user is a member of that Clerk org (from JWT claims), and returns the Postgres company row. One shared dependency protects all routes.
- **D-09:** Cross-company access attempts return **403** (not 404) — backend enforces membership, not just UI hiding (COMP-05).

### Roles and Permissions
- **D-10:** Phase 2 ships **4 fixed roles** as enums: `Owner`, `Admin`, `Accountant`, `Viewer`. Role names are stored as Clerk org membership metadata.
- **D-11:** Permissions are **data-driven rows in Postgres** (`role_permissions` table) using `resource:action` format (e.g., `invoices:create`, `invoices:approve`, `users:invite`). Phase 6 can add new permissions without code changes.
- **D-12:** Role semantics: **Owner** — full access + billing/org management. **Admin** — full access except billing. **Accountant** — finance read/write, no user management. **Viewer** — read-only across finance features.

### Audit Events
- **D-13:** Audit events are written **synchronously in the same async transaction** as the business action. Audit write and business write commit atomically — no orphan records, no silent audit gaps.
- **D-14:** Change detail is stored as **JSONB `{before: {...}, after: {...}}` snapshots** — human-readable, queryable, entity-agnostic.
- **D-15:** `audit_events` is a **single table with `company_id`** column. All phases write to it. Scoped queries filter by `company_id` (AUDT-04).

### Frontend Clerk Integration
- **D-16:** Frontend uses the **Clerk React SDK** (`@clerk/clerk-react`). Route protection via `<SignedIn>` / `<SignedOut>` components wrapping React Router. No custom auth context.
- **D-17:** Company switcher is a **dropdown in the app header**. Selecting a company calls Clerk's `setActive({ organization })` to rotate the JWT, then clears the TanStack Query cache.
- **D-18:** Active company context available in components via Clerk's `useOrganization()` hook.

### Claude's Discretion
- Clerk webhook endpoint implementation details (signature verification, retry handling).
- Specific Clerk JWT verification approach in FastAPI (JWKS endpoint or Clerk Python SDK if available).
- Shadow table sync strategy for edge cases (user removed from org, org deleted).
- Postgres schema column names and index strategy for `users`, `companies`, `audit_events`, and `role_permissions`.
- How `asyncpg` is wired into SQLAlchemy (engine config, session factory, lifespan management).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Core value, constraints, key decisions (FastAPI, PostgreSQL, monorepo, no microservices, UAE-first). Read this first.
- `.planning/REQUIREMENTS.md` — Full v1 requirements. Phase 2 covers: AUTH-01–05, COMP-01–05, SETUP-01–04, AUDT-01, AUDT-02, AUDT-04.
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and 4-plan breakdown (02-01 through 02-04).

### Phase 1 Decisions (carry forward)
- `.planning/phases/01-monorepo-and-api-web-foundations/01-CONTEXT.md` — Monorepo structure, API contract mechanism, frontend stack (shadcn/ui, Tailwind, React Router v6, TanStack Query), atomic component split. All carry into Phase 2.

### External Services
- Clerk documentation — Auth provider, Organizations, org roles, membership metadata, `setActive()`, `useOrganization()`, webhook events. Researcher must check current Clerk docs for FastAPI JWT verification approach and Python SDK availability.

### No additional specs
No ADRs or design docs exist beyond the above. All implementation decisions are captured in this file.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/core/config.py` — Injectable `Settings` via `get_settings()` dependency. Extend with `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` env vars.
- `backend/app/db/session.py` — Existing DB session factory. Must be upgraded from sync to async SQLAlchemy (`asyncpg` engine, `AsyncSession`).
- `backend/app/db/base.py` — `DeclarativeBase` — all Phase 2 models (`User`, `Company`, `RolePermission`, `AuditEvent`) extend this.
- `backend/app/api/router.py` — Central `APIRouter`. Add `/api/v1/companies/{company_id}/` prefix router here.
- `frontend/src/app/router.tsx` — React Router entry. Wrap with Clerk `<ClerkProvider>` + `<SignedIn>`/`<SignedOut>` guards.
- `frontend/src/api/` — Generated OpenAPI client. New company-scoped routes generate new typed methods here after `make gen-types`.

### Established Patterns
- **Module ownership**: Platform auth/session logic goes in `backend/app/platform/`. Audit logic goes in `backend/app/audit/`. Finance domain remains untouched in Phase 2.
- **Dependency injection**: Settings and DB session both injected via FastAPI `Depends()`. `get_current_company` follows this same pattern.
- **Atomic component split**: Frontend components in `frontend/src/components/` use `atoms/`, `molecules/`, `organisms/`, `templates/`. Company switcher UI is a molecule; app shell header is an organism.

### Integration Points
- **Backend**: `app.api.router` gets a new company-scoped sub-router. `app.platform` gets auth middleware/dependencies. `app.audit` gets the `AuditEvent` model and write helper.
- **Frontend**: `main.tsx` wraps app with `<ClerkProvider>`. `router.tsx` adds `<SignedIn>`/`<SignedOut>` gates. App shell header (`organisms/`) gets company switcher.
- **Migrations**: New Alembic migration for `users`, `companies`, `role_permissions`, `audit_events` tables. Session factory must be upgraded to async before Phase 2 models land.

</code_context>

<specifics>
## Specific Ideas

- The `get_current_company` dependency is the single enforcement point for multi-tenancy. It must be tested with a user who has JWT claims for Org A attempting to access `/companies/{org_b_id}/...` — must return 403 (COMP-05).
- Clerk webhook handler must process at minimum: `user.created`, `user.updated`, `organizationMembership.created`, `organizationMembership.deleted`, `organization.created`, `organization.updated` events to keep shadow tables in sync.
- TanStack Query cache must be cleared (via `queryClient.clear()`) when `setActive()` is called on company switch — stale data from the previous company must not bleed through.
- Phase 2 audit events cover: user login, user invite, role assignment, company settings update. Later phases extend the same `AuditEvent` model without schema changes.

</specifics>

<deferred>
## Deferred Ideas

- Full Arabic/RTL UI — deferred to Phase 6 (SETUP-07).
- Company logo upload — deferred to Phase 3 (SETUP-05).
- Company brand color theming — deferred to Phase 6 (SETUP-06).
- Configurable custom roles — deferred to Phase 6 (CONF-01 through CONF-06). Phase 2 ships fixed roles; Phase 6 makes them configurable.
- Subdomain-per-company routing — considered and deferred. Too complex for Phase 2 scope.

</deferred>

---

*Phase: 2-Company Access and Tenant Foundation*
*Context gathered: 2026-06-06*
