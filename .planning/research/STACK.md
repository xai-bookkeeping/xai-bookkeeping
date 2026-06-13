# Stack Research

**Domain:** UAE-first cloud accounting and finance SaaS for SMEs
**Researched:** 2026-05-31
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Python | 3.14.x, or 3.13.x if dependency support requires | Backend runtime | Strong fit for tabular data, reporting, background processing, and future AI integrations. Python 3.14 is current stable; 3.13 remains a conservative fallback if production dependencies lag. |
| FastAPI | 0.136.3 | Backend API framework | High-performance Python API framework with automatic OpenAPI docs, Pydantic validation, async support, and a natural path to AI/data-heavy features. |
| Pydantic | 2.13.4 | Backend validation and schemas | Core FastAPI validation model; useful for request/response contracts, settings, tax/document schemas, and future AI tool/data contracts. |
| SQLAlchemy | 2.0.50 | Backend ORM/data access | Mature Python ORM with strong PostgreSQL support and enough control for accounting, reporting, and complex tabular queries. |
| Alembic | 1.18.4 | Database migrations | Standard migration tool for SQLAlchemy-based FastAPI services. |
| PostgreSQL | 18.x, or managed 17.x/18.x | Relational database | Accounting data is relational, transactional, and audit-sensitive. PostgreSQL has mature constraints, transactions, JSONB for configurable fields, and row-level security options. |
| TypeScript | 6.0.3 | Frontend type-safe app code | Frontend forms, permissions, table views, and generated API clients benefit from static typing. |
| React | 19.2.6 | Frontend UI layer | Good fit for dashboard-heavy operational SaaS interfaces. |
| Vite | 8.0.14 | Frontend build tool | Clean frontend-only app boundary that pairs well with a separate FastAPI API. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Uvicorn | 0.48.0 | ASGI server | Run FastAPI in development and production behind a process manager/container platform. |
| Pandas | 3.0.3 | Tabular data processing | Use for exports, imports, VAT/report calculations, and accountant-facing tabular workflows where relational queries alone are not enough. |
| Polars | 1.41.2 | High-performance tabular processing | Use for larger report/export workloads once data volume grows. |
| OpenAI Python SDK | 2.38.0 | Future AI integration | Keep out of Phase 1 core unless an AI workflow is explicitly planned; useful later for finance assistant, categorization, and document intelligence. |
| Tailwind CSS | 4.3.0 | UI styling | Fast implementation of dense dashboards and forms while keeping design tokens centralized. |
| TanStack Query | 5.100.14 | Frontend server state | Use for dashboard widgets, async lists, and mutations against FastAPI endpoints. |
| TanStack Table | 8.21.3 | Frontend tabular UI | Strong fit for invoices, bills, customers, suppliers, audit logs, and reports. |
| Playwright | 1.60.0 | End-to-end testing | Critical for invoice, approval, VAT, permission, and PDF workflows. |
| Pytest | 9.0.3 | Backend testing | Use for accounting rules, VAT calculations, permissions, audit log behavior, and workflow logic. |
| Vitest | 4.1.7 | Frontend unit/integration testing | Use for UI behavior, formatting, and client-side table/form utilities. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Monorepo workspace tooling | Coordinate frontend and backend | Keep `apps/api`, `apps/web`, shared docs, generated clients, and tests together. |
| Ruff + Pyright or mypy | Python linting and type checks | Treat financial calculation code as high-risk; avoid weak typing in domain logic. |
| ESLint + TypeScript strict mode | Frontend code quality and type enforcement | Frontend tables/forms should not drift from backend contracts. |
| Alembic migrations | Database evolution | Require reviewed migrations for ledger, audit, and tenant isolation changes. |
| OpenAPI client generation | Frontend/backend contract | Generate typed frontend clients from FastAPI OpenAPI schemas to reduce drift. |
| Playwright traces | Workflow debugging | Keep traces for failed tests around invoice creation, approvals, and permission boundaries. |
| Seed fixtures | Repeatable finance scenarios | Include UAE VAT invoices, exempt/non-taxable examples, supplier bills, partial payments, and multi-company fixtures. |

## Installation

```bash
# Backend
uv add fastapi==0.136.3 uvicorn==0.48.0 pydantic==2.13.4 sqlalchemy==2.0.50 alembic==1.18.4 psycopg[binary]
uv add pandas==3.0.3 polars==1.41.2
uv add --dev pytest==9.0.3 ruff pyright

# Frontend
npm install react@19 react-dom@19 @vitejs/plugin-react@6 vite@8 @tanstack/react-query@5 @tanstack/react-table@8 tailwindcss@4
npm install -D typescript@6 vitest@4 playwright@1
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| FastAPI backend | Next.js full-stack backend | Use Next.js backend only if the team chooses a TypeScript-only product stack and does not prioritize Python data/AI workflows. |
| React + Vite frontend | Next.js frontend | Use Next.js frontend if server-rendered marketing/public pages become central. For an authenticated business app, Vite keeps the split clean. |
| SQLAlchemy + Alembic | SQLModel | Use SQLModel for simpler CRUD-heavy apps; SQLAlchemy gives more explicit control for accounting/reporting complexity. |
| PostgreSQL | MySQL | Use MySQL only if hosting constraints require it; PostgreSQL is stronger for relational integrity plus JSONB configurability. |
| Modular FastAPI backend | Microservices | Use microservices later when domain boundaries, team ownership, or scaling pressure justify distributed complexity. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Floating-point numbers for money | Rounding drift breaks accounting trust. | Integer minor units or fixed-decimal database fields with domain helpers. |
| Single-tenant assumptions | Multi-company privacy is core scope and hard to retrofit. | Tenant/company scoping in schema, queries, permissions, and tests from day one. |
| PDF-only invoice architecture | Official UAE eInvoicing guidance states PDFs/images/emails are not eInvoices. | Store structured invoice data first; generate PDF as a rendering/output. |
| Ad hoc audit messages | Weak audit records fail compliance and debugging needs. | Append-only audit events with actor, company, entity, action, before/after, timestamp, and request context. |
| Over-customized workflow engine in v1 | Can delay the first working finance loop. | Build constrained workflow primitives: statuses, approvals, custom fields, roles, templates. |
| Microservices in Phase 1 | Adds distributed transactions, deployment, observability, and service-contract overhead before the domain is proven. | Monorepo with separate frontend/backend apps and a modular FastAPI backend. |

## Stack Patterns by Variant

**If deploying quickly with a small team:**
- Use a managed PostgreSQL provider and managed object storage.
- Keep a monorepo with `apps/api` for FastAPI and `apps/web` for React/Vite.
- Keep the backend modular internally, with explicit boundaries for platform, finance, accounting, reporting, workflow, audit, and integrations.

**If data-heavy reporting becomes a differentiator:**
- Add reporting tables/materialized views and backend jobs.
- Use Pandas/Polars for export/report workloads where they outperform direct ORM patterns.
- Keep report definitions versioned and reconciled to ledger data.

**If AI features become product scope:**
- Keep AI workflows behind backend services that can read normalized finance data safely.
- Add explicit permission checks, audit events, prompt/data retention policy, and evaluation tests before exposing AI outputs to users.

**If microservices become justified later:**
- Extract the most independent backend modules first, such as reporting/exports, document generation, eInvoicing integration, or AI services.
- Keep ledger writes and accounting consistency strongly controlled.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| FastAPI 0.136.3 | Pydantic 2.13.x, Python 3.13/3.14 | FastAPI uses Pydantic for validation and OpenAPI schemas. |
| SQLAlchemy 2.0.50 | Alembic 1.18.x, PostgreSQL 17/18 | Use SQLAlchemy 2 style and reviewed Alembic migrations. |
| Vite 8.0.14 | React 19.2.x, TypeScript 6.x | Clean frontend app that consumes the FastAPI API. |
| TanStack Query 5.x | React 19.x | Use for API state and mutations. |
| Tailwind CSS 4.x | Modern browsers | Good for SaaS app UI; test RTL readiness even before full Arabic UI. |

## Sources

- https://fastapi.tiangolo.com/ - FastAPI framework, OpenAPI, validation, and SQL database guidance.
- https://github.com/FastAPI/FastAPI - FastAPI latest release version check.
- https://www.python.org/downloads/ and https://blog.python.org/2026/02/python-3143-and-31312-are-now-available.html - current Python release context.
- https://www.sqlalchemy.org/ - SQLAlchemy ORM and SQL toolkit.
- https://alembic.sqlalchemy.org/ - Alembic migration tooling.
- https://www.postgresql.org/ - PostgreSQL current supported releases and reliability positioning.
- https://vite.dev/ - Vite frontend tooling.
- https://react.dev/versions - React latest major/minor line.
- https://mof.gov.ae/en/public-finance/tax/value-added-tax-vat/ - UAE VAT rate, registration thresholds, and record-keeping expectations.
- https://mof.gov.ae/en/about-us/initiatives/einvoicing/ - UAE eInvoicing official portal and structured invoice definition.
- npm registry and PyPI version checks on 2026-05-31 for React, Vite, TypeScript, FastAPI, Pydantic, SQLAlchemy, Alembic, Uvicorn, Pandas, Polars, TanStack Query/Table, Playwright, Pytest, and Vitest.

---
*Stack research for: UAE-first accounting SaaS*
*Researched: 2026-05-31*
