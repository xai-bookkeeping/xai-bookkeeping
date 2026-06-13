# Phase 2: Company Access and Tenant Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 2-Company Access and Tenant Foundation
**Areas discussed:** Auth Token Strategy, Company Context in API, Roles Model, Audit Event Pattern, Frontend Clerk Integration

---

## Auth Token Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| httpOnly cookie | Backend sets cookie — JS can't read it, XSS can't steal tokens | ✓ |
| localStorage / Authorization header | Frontend stores JWT, sends as Bearer header | |
| In-memory (sessionStorage) | Token in memory only, gone on tab close | |

**User's choice:** httpOnly cookie

**Notes:** User also requested using Clerk as the auth provider — this changes the entire auth implementation from custom JWT to Clerk-managed sessions with httpOnly cookies as Clerk's default mechanism.

---

## Clerk as Auth Provider

| Option | Description | Selected |
|--------|-------------|----------|
| Clerk Orgs for companies | Clerk Org = XAI Company, membership/switching in Clerk | ✓ |
| Clerk identity only, Postgres membership | Clerk handles login only, company tables in Postgres | |

**User's choice:** Clerk Orgs for companies

**Notes:** User asked about pricing. Free tier: 10k MAUs, ~5 orgs / ~5 members per org. Pro: ~$25/month + per-MAU over 10k. Free tier sufficient for development; production will need Pro.

---

## Postgres Shadow Tables

| Option | Description | Selected |
|--------|-------------|----------|
| Shadow tables via webhook | Clerk webhook syncs user + org to Postgres. Business FKs point to local rows | ✓ |
| Clerk IDs as bare string FKs | No local tables; store clerk_user_id/clerk_org_id strings directly | |

**User's choice:** Postgres shadow tables via webhook

---

## Company Context in API

| Option | Description | Selected |
|--------|-------------|----------|
| URL path prefix | /api/v1/companies/{company_id}/... — RESTful, inspectable | ✓ |
| Clerk JWT org claim only | Implicit company from JWT, simpler URLs | |
| Request header X-Company-ID | Frontend sends header on every request | |

**User's choice:** URL path prefix

---

## Tenant Enforcement Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| FastAPI dependency get_current_company | Reusable dependency validates membership from JWT | ✓ |
| Middleware | Blanket middleware checks every request | |
| Per-route manual check | Each route handler checks manually | |

**User's choice:** FastAPI dependency (get_current_company)

---

## Roles Model Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed roles, data-driven permissions | 4 predefined role enums, permissions as Postgres rows | ✓ |
| Fully hardcoded | Roles and permissions as pure Python code | |
| Fully data-driven from day one | All roles, permissions, assignments in DB | |

**User's choice:** Fixed roles, data-driven permissions

---

## Role Set

| Option | Description | Selected |
|--------|-------------|----------|
| Owner, Admin, Accountant, Viewer | 4 roles with clear SME separation | ✓ |
| Admin, Accountant, Viewer | 3 roles — no Owner distinction | |
| Custom | User-defined role names | |

**User's choice:** Owner, Admin, Accountant, Viewer

---

## Permission Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Resource + action | invoices:create, invoices:approve, users:invite | ✓ |
| Feature flags per role | can_manage_users, can_view_finance, can_approve | |
| Full CRUD per resource | invoices:read, invoices:write, invoices:delete per resource | |

**User's choice:** Resource + action format

---

## Audit Write Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Same async transaction, atomic | Audit and business write commit together | ✓ |
| Async BackgroundTask after response | Audit fires after response, gaps possible | |

**User's choice:** Same transaction, atomic

**Notes:** User raised valid concern about sync vs async DB engines. Clarified: question was about transaction atomicity, not driver sync/async. Async SQLAlchemy (asyncpg) confirmed as the DB driver throughout — fully non-blocking.

---

## Audit Change Detail Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON before/after snapshots | {before: {...}, after: {...}} JSONB | ✓ |
| Field-level diff only | {changed: {field: [old, new]}} | |
| Action description string | Plain text description | |

**User's choice:** JSON before/after snapshots (JSONB)

---

## Frontend Route Protection

| Option | Description | Selected |
|--------|-------------|----------|
| Clerk SignedIn/SignedOut + React Router guards | Standard Clerk React SDK pattern | ✓ |
| Custom auth context + manual JWT checks | Custom AuthProvider wrapping Clerk APIs | |

**User's choice:** Clerk React SDK with SignedIn/SignedOut components

---

## Company Switcher UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown in app header, setActive() | Header dropdown, Clerk setActive(), clear TQ cache | ✓ |
| Dedicated /switch page | Always land on company picker after login | |
| Separate subdomains per company | company-a.xaibooks.com — complex routing | |

**User's choice:** Header dropdown with Clerk setActive()

---

## Claude's Discretion

- Clerk webhook endpoint implementation (signature verification, retry handling)
- FastAPI JWT verification approach (JWKS vs Clerk Python SDK)
- Shadow table sync edge cases (user removed from org, org deleted)
- Postgres schema column names and index strategy
- asyncpg wiring into SQLAlchemy (engine config, session factory, lifespan)

## Deferred Ideas

- Full Arabic/RTL UI → Phase 6
- Company logo upload → Phase 3
- Company brand color theming → Phase 6
- Configurable custom roles → Phase 6
- Subdomain-per-company routing → considered and deferred
