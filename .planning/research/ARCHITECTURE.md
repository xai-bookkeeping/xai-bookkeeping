# Architecture Research

**Domain:** UAE-first cloud accounting and finance SaaS for SMEs
**Researched:** 2026-05-31
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Web Application                         │
│  Owner Dashboard | Invoices | Expenses | Contacts | Reports  │
├─────────────────────────────────────────────────────────────┤
│                    Application Services                      │
│ Auth | Tenant Context | Permissions | Workflows | Audit       │
├─────────────────────────────────────────────────────────────┤
│                       Finance Domain                         │
│ Customers | Suppliers | Invoices | Bills | Payments | VAT     │
├─────────────────────────────────────────────────────────────┤
│                    Accounting Domain Core                     │
│ Chart of Accounts | Journal Entries | Posting Rules | Periods │
├─────────────────────────────────────────────────────────────┤
│                      Platform Foundation                      │
│ Companies | Users | Roles | Custom Fields | Templates         │
├─────────────────────────────────────────────────────────────┤
│                       Persistence                             │
│ PostgreSQL | Object Storage | Audit Event Store               │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Tenant/company context | Ensure every request operates inside exactly one company unless explicitly administering memberships. | Company-scoped middleware/context plus database constraints and query helpers. |
| Identity and users | Login, invitations, memberships, and user lifecycle. | Auth provider or first-party auth tables, with company membership and role mapping. |
| Permissions | Decide who can view, create, approve, edit, delete, export, or configure records. | Role/permission matrix with policy functions and tests. |
| Contacts | Customers, suppliers, TRNs, addresses, payment terms, custom fields. | Shared contact model with customer/supplier flags or separate bounded models. |
| Documents | Invoices, supplier bills, line items, taxes, statuses, PDFs. | Structured document tables plus generated PDF files in object storage. |
| Workflow engine | Approval and lifecycle transitions for invoices/bills. | Constrained state machine per document type; avoid free-form workflow scripting in v1. |
| Ledger/posting engine | Convert business events into balanced journal entries. | Domain service that validates debits=credits and writes immutable postings. |
| VAT engine | Apply UAE VAT defaults and produce VAT summaries. | Tax code tables plus calculation helpers and report queries. |
| Audit log | Record who did what, when, on which company/entity, and what changed. | Append-only audit_events table, request correlation IDs, before/after JSON diffs. |
| Configuration | Custom fields, templates, numbering, approval rules, roles. | Metadata tables with typed validation and scoped availability. |

## Recommended Project Structure

```text
src/
├── app/                    # Next.js routes and page shells
├── components/             # Reusable UI components
├── features/               # Vertical feature modules
│   ├── auth/
│   ├── companies/
│   ├── contacts/
│   ├── invoices/
│   ├── expenses/
│   ├── payments/
│   ├── dashboard/
│   └── settings/
├── domains/                # Domain logic independent of routes
│   ├── accounting/
│   ├── vat/
│   ├── workflow/
│   ├── permissions/
│   └── audit/
├── db/                     # Prisma client, migrations, seed data
├── lib/                    # Cross-cutting helpers
├── tests/                  # Integration and E2E fixtures/utilities
└── styles/                 # Global CSS and design tokens
```

### Structure Rationale

- **features/:** Keep user-facing vertical workflows close together so phases can deliver end-to-end slices.
- **domains/:** Keep accounting, VAT, permissions, audit, and workflow rules testable without UI coupling.
- **db/:** Make schema and migrations explicit because finance data shape is a core product asset.
- **tests/:** Finance scenarios need reusable fixtures: companies, users, roles, invoices, bills, VAT treatments, and ledgers.

## Architectural Patterns

### Pattern 1: Modular Monolith with Domain Boundaries

**What:** One deployable app with clear internal modules for platform, finance, accounting, and reporting.
**When to use:** Best for Phase 1 and multi-developer velocity.
**Trade-offs:** Faster and easier to reason about than microservices; requires discipline to keep boundaries clean.

### Pattern 2: Event-Driven Posting Within the Monolith

**What:** Business actions create domain events and posting instructions; the accounting service writes balanced journal entries.
**When to use:** Invoices, approvals, payments, supplier bills, and adjustments.
**Trade-offs:** More upfront modeling, but avoids "report-only accounting" that cannot be trusted.

### Pattern 3: Company-Scoped Everything

**What:** Every business record includes company/tenant scope; access is always checked against membership and role.
**When to use:** All XAI Books data.
**Trade-offs:** More verbose queries and tests; prevents catastrophic cross-company leakage.

### Pattern 4: Metadata-Driven Configuration, Not Arbitrary Scripting

**What:** Custom fields, templates, and workflows are stored as constrained metadata.
**When to use:** v1 configurability.
**Trade-offs:** Less powerful than a workflow scripting engine, but much easier to test and support for SMEs.

## Data Flow

### Invoice Flow

```text
User creates invoice
    -> Permission check
    -> Validate customer, company VAT settings, line items, custom fields
    -> Calculate VAT and totals
    -> Save structured invoice draft
    -> Audit event: invoice.created
    -> Approval transition if required
    -> On approval/posting: generate journal entries
    -> Render PDF from structured invoice
    -> Dashboard/VAT/report queries update from canonical data
```

### Supplier Bill Flow

```text
User records bill/expense
    -> Permission check
    -> Validate supplier, VAT treatment, attachment metadata
    -> Save bill/expense
    -> Optional approval
    -> Post to ledger
    -> Track payable/payment status
    -> Audit event with before/after changes
```

### State Management

```text
Server canonical state in PostgreSQL
    -> Server-rendered pages and route handlers
    -> Client cache for dashboard widgets and interactive forms
    -> Mutations call server actions/API handlers
    -> Audit and ledger writes happen server-side only
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k companies | Modular monolith, managed PostgreSQL, object storage, background jobs for PDFs/emails. |
| 1k-100k companies | Add read replicas/reporting views, stronger job queues, partition audit/events by company/time, cache dashboards. |
| 100k+ companies | Split reporting/eInvoicing/background workloads first; keep ledger writes strongly consistent. |

### Scaling Priorities

1. **First bottleneck:** dashboard/report queries over ledger and audit data. Fix with summary tables/materialized views and company/date indexes.
2. **Second bottleneck:** PDF generation and future eInvoice exchange. Fix with background jobs and idempotent document status transitions.
3. **Third bottleneck:** audit event volume. Fix with partitioning, retention policy, and export tooling while preserving required records.

## Anti-Patterns

### Anti-Pattern 1: Reports Without a Ledger

**What people do:** Calculate dashboards directly from invoice/expense rows and call it accounting.
**Why it's wrong:** Financial reports become inconsistent once payments, credits, adjustments, and periods appear.
**Do this instead:** Use event-driven postings and balanced journal entries from the start.

### Anti-Pattern 2: Tenant Isolation Only in UI

**What people do:** Hide other companies in navigation but rely on ad hoc filters.
**Why it's wrong:** One missed filter can leak financial data.
**Do this instead:** Enforce company scope in database schema, service APIs, authorization checks, and tests.

### Anti-Pattern 3: Free-Form Custom Fields Everywhere

**What people do:** Add generic JSON blobs without validation, indexing, or lifecycle.
**Why it's wrong:** Search, reporting, exports, and validation become unreliable.
**Do this instead:** Typed custom field definitions with allowed entities, validation rules, and display/reporting metadata.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Email provider | Event-triggered notifications | Invoice sent, invitation, approval request, password reset. |
| Object storage | Store PDFs and attachments | Store metadata in PostgreSQL; access must be company-scoped. |
| Payment provider | Future integration | Start with manual payment recording; add online payments later. |
| Bank feeds/import | Future integration | Defer until base ledger/payment flows are stable. |
| UAE eInvoicing ASP | Future provider boundary | Official framework uses structured data exchange; design invoice data and status logs now. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI -> domain services | Server actions/API handlers | No ledger, audit, or permission writes from the client. |
| Finance docs -> accounting | Domain events/posting service | Posting rules should be deterministic and tested. |
| Workflows -> permissions | Policy checks | Approval transitions must verify actor role and company. |
| Config -> features | Metadata reads | Custom fields/templates should be cached but validated server-side. |

## Sources

- https://mof.gov.ae/en/about-us/initiatives/einvoicing/ - structured invoice definition and eInvoicing model.
- https://mof.gov.ae/en/public-finance/tax/value-added-tax-vat/ - VAT and record-keeping expectations.
- https://tax.gov.ae/DataFolder/Files/Guides/CT/Small%20Business%20Relief%20Guide%20-%20EN%20-%2027%2008%202023.pdf - business records, supporting documents, and seven-year retention expectation.
- https://www.postgresql.org/ - PostgreSQL reliability and supported version information.
- https://docs.prisma.io/docs/v6/orm/overview/databases/postgresql - Prisma/PostgreSQL connector shape.
- Product feature comparisons from Wafeq, QuickBooks UAE, Zoho Books UAE, and Xero feature pages.

---
*Architecture research for: UAE-first accounting SaaS*
*Researched: 2026-05-31*
