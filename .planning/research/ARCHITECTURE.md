# Architecture Research

**Domain:** UAE-first cloud accounting and finance SaaS for SMEs
**Researched:** 2026-05-31
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Monorepo Workspace                        │
│  apps/web (React/Vite) | apps/api (FastAPI) | shared docs     │
├─────────────────────────────────────────────────────────────┤
│                    Frontend Application                      │
│  Owner Dashboard | Tables | Forms | Workflows | Settings      │
├─────────────────────────────────────────────────────────────┤
│                         API Boundary                         │
│  OpenAPI Contracts | Auth Context | Tenant Context | RBAC      │
├─────────────────────────────────────────────────────────────┤
│                    FastAPI Backend Modules                    │
│ Platform | Finance | Accounting | Reporting | Workflow | AI   │
├─────────────────────────────────────────────────────────────┤
│                    Accounting Domain Core                     │
│ Chart of Accounts | Journal Entries | Posting Rules | Periods │
├─────────────────────────────────────────────────────────────┤
│                      Platform Foundation                      │
│ Companies | Themes | Users | Roles | Custom Fields | Audit     │
├─────────────────────────────────────────────────────────────┤
│                       Persistence                             │
│ PostgreSQL | Object Storage | Audit Event Store               │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Frontend app | Authenticated business UI, dense tables, forms, dashboards, settings, and theming. | React/Vite app consuming typed OpenAPI clients from FastAPI. |
| API boundary | Stable contract between frontend and backend. | FastAPI routers, Pydantic schemas, OpenAPI client generation. |
| Tenant/company context | Ensure every request operates inside exactly one company unless explicitly administering memberships. | FastAPI dependency/middleware plus database constraints and query helpers. |
| Identity and users | Login, invitations, memberships, and user lifecycle. | Auth provider or first-party auth tables, with company membership and role mapping. |
| Permissions | Decide who can view, create, approve, edit, delete, export, or configure records. | Role/permission matrix with policy functions and tests. |
| Company themes | Per-company logo, brand colors, invoice/report presentation settings. | Theme settings table, asset storage, frontend theme tokens, document-rendering context. |
| Contacts | Customers, suppliers, TRNs, addresses, payment terms, custom fields. | Shared contact model with customer/supplier flags or separate bounded models. |
| Documents | Invoices, supplier bills, line items, taxes, statuses, PDFs. | Structured document tables plus generated PDF files in object storage. |
| Workflow engine | Approval and lifecycle transitions for invoices/bills. | Constrained state machine per document type; avoid free-form workflow scripting in v1. |
| Ledger/posting engine | Convert business events into balanced journal entries. | Backend domain service that validates debits=credits and writes immutable postings. |
| VAT engine | Apply UAE VAT defaults and produce VAT summaries. | Tax code tables plus calculation helpers and report queries. |
| Reporting/data services | Produce owner dashboards, VAT summaries, exports, and later data-heavy analysis. | SQL/reporting queries, materialized views, Pandas/Polars jobs when useful. |
| Audit log | Record who did what, when, on which company/entity, and what changed. | Append-only audit_events table, request correlation IDs, before/after JSON diffs. |
| Configuration | Custom fields, templates, numbering, approval rules, roles. | Metadata tables with typed validation and scoped availability. |
| Future AI services | Finance assistant, categorization, document intelligence, anomaly detection. | Backend-only services with permission checks, audit, evals, and data retention policy. |

## Recommended Project Structure

```text
apps/
├── api/                         # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── platform/            # companies, themes, users, roles, permissions
│   │   ├── finance/             # contacts, invoices, bills, payments
│   │   ├── accounting/          # chart of accounts, journals, posting rules
│   │   ├── reporting/           # dashboard, VAT summary, exports
│   │   ├── workflow/            # approvals and state transitions
│   │   ├── audit/               # audit event model and readers
│   │   ├── integrations/        # email, storage, future payments/eInvoicing
│   │   └── ai/                  # future AI/data features, initially minimal
│   ├── migrations/              # Alembic migrations
│   └── tests/
├── web/                         # React/Vite frontend
│   ├── src/
│   │   ├── app/                 # routing/app shell
│   │   ├── features/            # UI feature modules
│   │   ├── components/          # reusable UI
│   │   ├── api/                 # generated API client
│   │   ├── theme/               # brand/theme tokens
│   │   └── tests/
│   └── e2e/
├── shared/                      # generated schemas, fixtures, docs if needed
└── docs/                        # engineering docs outside .planning if needed
```

### Structure Rationale

- **apps/api:** Backend owns business rules, accounting integrity, VAT logic, permissions, audit, reporting, and future AI/data services.
- **apps/web:** Frontend owns operational UX, dense tables, dashboards, forms, and company theme rendering.
- **OpenAPI contract:** Keeps frontend/backend split productive while reducing contract drift.
- **Backend modules:** Preserve microservice-ready boundaries without paying microservice costs in Phase 1.
- **tests:** Finance scenarios need reusable fixtures: companies, themes, users, roles, invoices, bills, VAT treatments, and ledgers.

## Architectural Patterns

### Pattern 1: Monorepo with Split Frontend and Backend

**What:** One repository containing separately deployable frontend and backend applications.
**When to use:** Best for this project because the team wants frontend/backend separation but shared coordination.
**Trade-offs:** Clear ownership and Python backend strengths; requires API contract discipline.

### Pattern 2: Modular FastAPI Backend

**What:** One backend deployable with internal modules for platform, finance, accounting, reporting, workflow, audit, integrations, and future AI.
**When to use:** Phase 1 through product validation.
**Trade-offs:** Avoids distributed-system overhead while preserving boundaries that can become services later.

### Pattern 3: Event-Driven Posting Inside Backend Transactions

**What:** Business actions create domain events and posting instructions; the accounting service writes balanced journal entries.
**When to use:** Invoices, approvals, payments, supplier bills, and adjustments.
**Trade-offs:** More upfront modeling, but avoids "report-only accounting" that cannot be trusted.

### Pattern 4: Company-Scoped Everything

**What:** Every business record includes company/tenant scope; access is always checked against membership and role.
**When to use:** All XAI Books data, files, themes, dashboards, and reports.
**Trade-offs:** More verbose queries and tests; prevents catastrophic cross-company leakage.

### Pattern 5: Metadata-Driven Configuration, Not Arbitrary Scripting

**What:** Custom fields, templates, and workflows are stored as constrained metadata.
**When to use:** v1 configurability.
**Trade-offs:** Less powerful than a workflow scripting engine, but much easier to test and support for SMEs.

## Data Flow

### Invoice Flow

```text
User creates invoice in web app
    -> FastAPI endpoint
    -> Tenant + permission dependencies
    -> Validate customer, company VAT settings, line items, custom fields
    -> Calculate VAT and totals server-side
    -> Save structured invoice draft
    -> Audit event: invoice.created
    -> Approval transition if required
    -> On approval/posting: generate journal entries
    -> Render PDF from structured invoice and company theme
    -> Dashboard/VAT/report queries update from canonical data
```

### Supplier Bill Flow

```text
User records bill/expense
    -> FastAPI endpoint
    -> Permission check
    -> Validate supplier, VAT treatment, attachment metadata
    -> Save bill/expense
    -> Optional approval
    -> Post to ledger
    -> Track payable/payment status
    -> Audit event with before/after changes
```

### Reporting/Data Flow

```text
Ledger + documents + payments
    -> SQL report queries / materialized views
    -> Backend reporting service
    -> Optional Pandas/Polars job for larger exports/analysis
    -> API response or generated export
    -> Frontend dashboard/table
```

### State Management

```text
Server canonical state in PostgreSQL
    -> FastAPI service methods own mutations
    -> React Query caches API responses in the web app
    -> TanStack Table renders dense operational grids
    -> Audit and ledger writes happen backend-side only
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k companies | Monorepo, split frontend/backend deployments, modular FastAPI backend, managed PostgreSQL, object storage, background jobs. |
| 1k-100k companies | Add read replicas/reporting views, stronger job queues, partition audit/events by company/time, cache dashboards, dedicated report workers. |
| 100k+ companies | Consider extracting reporting/exports, document generation, AI services, eInvoicing integration, or background processing into services. Keep ledger writes strongly consistent. |

### Scaling Priorities

1. **First bottleneck:** dashboard/report queries over ledger and audit data. Fix with summary tables/materialized views and company/date indexes.
2. **Second bottleneck:** tabular exports and reporting workloads. Fix with background jobs, Pandas/Polars pipelines, and generated report artifacts.
3. **Third bottleneck:** PDF generation and future eInvoice exchange. Fix with background jobs and idempotent document status transitions.
4. **Fourth bottleneck:** audit event volume. Fix with partitioning, retention policy, and export tooling while preserving required records.

## Anti-Patterns

### Anti-Pattern 1: Reports Without a Ledger

**What people do:** Calculate dashboards directly from invoice/expense rows and call it accounting.
**Why it's wrong:** Financial reports become inconsistent once payments, credits, adjustments, and periods appear.
**Do this instead:** Use event-driven postings and balanced journal entries from the start.

### Anti-Pattern 2: Tenant Isolation Only in UI

**What people do:** Hide other companies in navigation but rely on ad hoc filters.
**Why it's wrong:** One missed filter can leak financial data.
**Do this instead:** Enforce company scope in database schema, service APIs, authorization checks, files, reports, themes, and tests.

### Anti-Pattern 3: Free-Form Custom Fields Everywhere

**What people do:** Add generic JSON blobs without validation, indexing, or lifecycle.
**Why it's wrong:** Search, reporting, exports, and validation become unreliable.
**Do this instead:** Typed custom field definitions with allowed entities, validation rules, and display/reporting metadata.

### Anti-Pattern 4: Microservices Before the Product Boundary Is Known

**What people do:** Split platform, accounting, reporting, and documents into services immediately.
**Why it's wrong:** Distributed transactions and service contracts make early accounting correctness harder.
**Do this instead:** Keep separate frontend/backend apps in one monorepo, with a modular FastAPI backend that can be split later.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Email provider | Backend event-triggered notifications | Invoice sent, invitation, approval request, password reset. |
| Object storage | Store PDFs, attachments, and logos | Store metadata in PostgreSQL; access must be company-scoped. |
| Payment provider | Future integration | Start with manual payment recording; add online payments later. |
| Bank feeds/import | Future integration | Defer until base ledger/payment flows are stable. |
| UAE eInvoicing ASP | Future provider boundary | Official framework uses structured data exchange; design invoice data and status logs now. |
| AI model providers | Future backend-only integration | Require permission checks, audit, evaluation, and data retention controls. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Web -> API | OpenAPI-generated client | No ledger, audit, or permission writes from the client. |
| API routers -> domain services | Python service calls | Keep HTTP concerns out of accounting logic. |
| Finance docs -> accounting | Domain events/posting service | Posting rules should be deterministic and tested. |
| Workflows -> permissions | Policy checks | Approval transitions must verify actor role and company. |
| Config/themes -> features | Metadata reads | Custom fields/templates/themes should be cached but validated server-side. |
| Reporting -> accounting | Read models/report queries | Reports must reconcile to ledger/source records. |

## Sources

- https://fastapi.tiangolo.com/ - FastAPI framework and SQL database guidance.
- https://github.com/FastAPI/FastAPI - FastAPI release information.
- https://www.python.org/downloads/ - Python release context.
- https://www.sqlalchemy.org/ - SQLAlchemy ORM and SQL toolkit.
- https://alembic.sqlalchemy.org/ - migration tooling.
- https://mof.gov.ae/en/about-us/initiatives/einvoicing/ - structured invoice definition and eInvoicing model.
- https://mof.gov.ae/en/public-finance/tax/value-added-tax-vat/ - VAT and record-keeping expectations.
- https://tax.gov.ae/DataFolder/Files/Guides/CT/Small%20Business%20Relief%20Guide%20-%20EN%20-%2027%2008%202023.pdf - business records, supporting documents, and seven-year retention expectation.
- https://www.postgresql.org/ - PostgreSQL reliability and supported version information.
- Product feature comparisons from Wafeq, QuickBooks UAE, Zoho Books UAE, and Xero feature pages.

---
*Architecture research for: UAE-first accounting SaaS*
*Researched: 2026-05-31*
