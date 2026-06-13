# Project Research Summary

**Project:** XAI Books
**Domain:** UAE-first cloud accounting and finance SaaS for SMEs
**Researched:** 2026-05-31
**Confidence:** HIGH

## Executive Summary

XAI Books should be built as an owner-first accounting and finance SaaS with a serious accounting backbone. The market expectation is not just "invoices and expenses"; credible SME accounting products provide customers/suppliers, invoices, bills, payments, VAT tracking, reports, dashboards, permissions, customization, and accountant-friendly records. The product can differentiate by feeling UAE-native, simpler than enterprise ERP, configurable without becoming chaotic, and trustworthy through visible audit history.

The recommended architecture is a monorepo with a split frontend and backend: a React/Vite frontend and a FastAPI backend backed by PostgreSQL. Multi-company isolation, permissions, audit events, VAT calculations, and ledger posting rules should be foundation work, not later polish. Daily workflows should stay simple for owners, while accountants can inspect the ledger, VAT detail, approvals, and audit records behind the scenes. The backend should be modular enough to support later microservice extraction, but Phase 1 should avoid distributed-system overhead.

The biggest risks are treating accounting as ordinary CRUD, weak tenant isolation, duplicated VAT logic, confusing PDFs with structured eInvoices, and overbuilding configurability. The roadmap should therefore start with platform/accounting foundations, then deliver sales-to-cash, spend/payables, reporting/dashboard, and configuration/trust surfaces as vertical MVP slices.

## Key Findings

### Recommended Stack

Use a split frontend/backend monorepo: FastAPI on Python for the backend, PostgreSQL for the database, and React/Vite/TypeScript for the frontend. This gives the team a strong Python foundation for tabular data, reporting, future AI integration, and data-heavy features while keeping the web UI fast and modern.

**Core technologies:**
- Python 3.14/3.13: backend runtime for APIs, reporting, tabular data, and future AI services.
- FastAPI: backend API framework with OpenAPI contracts and Pydantic validation.
- React 19 + Vite 8 + TypeScript 6: frontend app stack for operational SaaS screens.
- PostgreSQL: transactional relational source of truth for accounting, audit, and tenant-scoped data.
- SQLAlchemy 2 + Alembic: backend data access and migrations for PostgreSQL.
- Pandas/Polars: reporting/export/data-heavy workloads when direct SQL is not enough.
- Pytest, Playwright, Vitest: verification for backend finance logic, end-to-end workflows, and frontend behavior.

### Expected Features

**Must have (table stakes):**
- Secure login, user management, roles, and company membership.
- Multi-company data isolation.
- Multi-company theme settings for logo and brand presentation (medium priority).
- Customers and suppliers.
- Sales invoices with UAE VAT, approval status, PDF output, and payment tracking.
- Expenses and supplier bills with VAT treatment and payment status.
- Chart of accounts and double-entry posting foundation.
- VAT summary report.
- Owner dashboard for receivables, payables, cash, revenue, expenses, and VAT position.
- Full audit/activity log.

**Should have (competitive):**
- UAE-first defaults: AED, TRN, 5% VAT, VAT-aware records, bilingual-ready labels.
- Configurable custom fields, templates, roles, permissions, and approval rules.
- Accountant-friendly drill-downs behind owner-first screens.
- Future eInvoicing readiness through structured invoice data.

**Defer (v2+):**
- Full Arabic/RTL UI.
- Inventory, payroll, corporate tax filing workflows, bank feeds/reconciliation, full eInvoicing ASP integration, and multi-currency.

### Architecture Approach

Build a monorepo with separately deployable frontend and backend apps. The backend should be a modular FastAPI application with clear platform, finance, accounting, reporting, workflow, permissions, audit, integrations, and future AI/data boundaries. Every business record should be company-scoped. Daily finance actions should generate structured records, audit events, and, when posted, balanced accounting entries. PDFs, dashboards, reports, and future eInvoicing integrations should be outputs of canonical structured data.

**Major components:**
1. Platform foundation - companies, company themes, users, memberships, roles, permissions, custom fields, templates.
2. Finance workflows - contacts, invoices, supplier bills, expenses, payments, approvals.
3. Accounting core - chart of accounts, posting rules, journal entries, VAT calculations.
4. Trust/reporting - audit log, dashboard, VAT summary, document evidence.

### Critical Pitfalls

1. **Finance as CRUD** - prevent with posting rules, ledger tests, and immutable/reversible posted records.
2. **Weak multi-company isolation** - prevent with mandatory company scope, authorization policies, and cross-company negative tests.
3. **VAT logic in UI** - prevent with server-side VAT engine and shared tests.
4. **PDF-only invoices** - prevent by storing structured invoice data first and rendering PDFs from it.
5. **Overbuilt configurability** - prevent with constrained typed fields, roles, templates, statuses, and approval primitives.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Platform and Accounting Foundation
**Rationale:** Multi-company isolation, permissions, audit, company settings, and chart of accounts are difficult to retrofit.
**Delivers:** Monorepo structure, FastAPI backend, React/Vite frontend, auth, companies, memberships, roles, permissions, AED/TRN/VAT settings, audit event model, chart of accounts, posting-rule skeleton.
**Addresses:** Secure login, user management, multi-company support, UAE-first defaults, trust foundation, frontend/backend split.
**Avoids:** Tenant leakage, weak audit, report-only accounting, premature microservices.

### Phase 2: Sales-to-Cash Workflow
**Rationale:** Invoicing is the primary daily workflow and validates UAE VAT behavior quickly.
**Delivers:** Customers, invoices, line items, VAT calculations, approval workflow, PDF invoices, payment recording.
**Addresses:** Invoice creation, VAT, approvals, PDF invoices, receivables.
**Avoids:** PDF-only invoice architecture and duplicated VAT logic.

### Phase 3: Spend and Payables Workflow
**Rationale:** The daily finance loop is incomplete without supplier bills, expenses, and payables.
**Delivers:** Suppliers, expenses, bills, attachments, purchase VAT treatment, bill/payment status, related postings.
**Addresses:** Supplier management, expense and supplier bill management, payables.
**Avoids:** One-sided finance product that only handles sales.

### Phase 4: Reporting, VAT Summary, and Owner Dashboard
**Rationale:** Owners need visible value and accountants need traceable totals after core transactions exist.
**Delivers:** VAT summary, owner dashboard, receivables/payables summaries, source-record drill-downs, basic financial reports.
**Addresses:** Real-time dashboard, VAT summary, trustworthy reporting.
**Avoids:** Dashboards disconnected from ledger/source records.

### Phase 5: Configuration and Trust Hardening
**Rationale:** The XAI platform promise depends on configurability, but it should land after core workflows prove the needed primitives.
**Delivers:** Custom fields, company theme settings, templates, configurable approval rules, admin controls, audit review surfaces, bilingual-ready copy/content structure.
**Addresses:** Configurability, company theming, roles/permissions depth, audit visibility, future Arabic readiness.
**Avoids:** Overbuilt workflow engine and late i18n blockers.

### Phase Ordering Rationale

- Tenant isolation, permissions, audit, and accounting primitives come first because every later workflow depends on them.
- The frontend/backend split should be established in Phase 1 because it shapes contracts, testing, deployment, and team ownership.
- Sales-to-cash and spend/payables are separate vertical slices so each can ship observable business value.
- Reporting follows transaction workflows because dashboards and VAT summaries need real source data.
- Configurability and company theming are built on observed workflow needs, avoiding a premature generic workflow engine.
- Microservices are deferred until the modular FastAPI backend reveals stable extraction boundaries.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Monorepo structure, FastAPI service structure, auth/tenant isolation, API contracts, and permission model decisions.
- **Phase 2:** UAE VAT invoice field requirements, PDF rendering, and future eInvoicing structured data.
- **Phase 4:** VAT summary semantics and report reconciliation against ledger postings.
- **Phase 5:** Custom field/reporting behavior, company theming, and Arabic/RTL readiness.

Phases with standard patterns:
- **Phase 3:** Supplier bills, expenses, and payables are standard accounting SaaS patterns, though VAT handling still needs careful tests.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Versions verified from live registry/docs; final deployment provider, auth provider, and exact Python version pin still undecided. |
| Features | HIGH | User-provided Phase 1 scope aligns with competitor expectations and official UAE compliance context. |
| Architecture | MEDIUM | Strong domain fit, but exact provider choices and existing team preferences remain open. |
| Pitfalls | HIGH | Risks are common to accounting SaaS and reinforced by UAE VAT/eInvoicing requirements. |

**Overall confidence:** HIGH

### Gaps to Address

- **Auth provider:** Decide during Phase 1 planning whether to use managed auth or first-party auth.
- **Frontend/backend contract:** Decide OpenAPI client generation and shared schema workflow during Phase 1 planning.
- **Money representation:** Choose decimal strategy and database representation before writing finance models.
- **VAT detail:** Confirm exact VAT invoice fields and report format during invoice/report planning.
- **eInvoicing readiness:** Keep structured invoice data now; only integrate with ASP/eInvoicing when product scope requires it.
- **Deployment/compliance posture:** Decide hosting region, backups, retention, and security evidence requirements before production.
- **Microservice extraction criteria:** Define later thresholds for splitting reporting, AI, document generation, or eInvoicing services.

## Sources

### Primary (HIGH confidence)
- https://mof.gov.ae/en/public-finance/tax/value-added-tax-vat/ - UAE VAT, registration thresholds, and record-keeping.
- https://mof.gov.ae/en/about-us/initiatives/einvoicing/ - official UAE eInvoicing portal and structured invoice definition.
- https://mof.gov.ae/en/news/ministry-of-finance-issues-uae-electronic-invoicing-guidelines-to-support-national-rollout/ - eInvoicing readiness, scope, governance, and phased rollout context.
- https://mof.gov.ae/en/news/ministry-of-finance-announces-targeted-amendments-to-einvoicing-system-decisions/ - AED 50m eInvoicing scope and 2027 mandatory implementation date for covered entities.
- https://tax.gov.ae/DataFolder/Files/Guides/CT/Small%20Business%20Relief%20Guide%20-%20EN%20-%2027%2008%202023.pdf - corporate tax record documentation and seven-year retention guidance.
- https://nodejs.org/es/about/previous-releases - Node.js LTS status.
- https://www.postgresql.org/ - PostgreSQL current supported versions and reliability positioning.
- https://fastapi.tiangolo.com/ - FastAPI framework and SQL database guidance.
- https://github.com/FastAPI/FastAPI - FastAPI release information.
- https://www.python.org/downloads/ - Python release context.
- https://www.sqlalchemy.org/ - SQLAlchemy ORM and SQL toolkit.
- https://alembic.sqlalchemy.org/ - migration tooling.
- https://vite.dev/ - Vite frontend tooling.
- https://react.dev/versions - React version line.

### Secondary (MEDIUM confidence)
- https://www.wafeq.com/en-ae - UAE accounting software feature positioning.
- https://quickbooks.intuit.com/ae/vat-tracking/ - UAE VAT tracking feature positioning.
- https://www.zoho.com/ar-ae/books/ - UAE accounting feature positioning.
- https://www.xero.com/us/accounting-software/all-features/ - general cloud accounting feature expectations.
- npm registry and PyPI version checks on 2026-05-31.

### Tertiary (LOW confidence)
- None used for product decisions.

---
*Research completed: 2026-05-31*
*Ready for roadmap: yes*
