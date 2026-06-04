# Roadmap: XAI Books

## Overview

XAI Books v1 builds a UAE-first accounting and finance product in vertical MVP slices. The work starts by establishing the monorepo, split FastAPI backend, React frontend, API contracts, and company-scoped platform foundation. It then delivers the daily finance loop through sales-to-cash, spend/payables, accounting integrity, reporting, dashboard visibility, and finally configuration, theming, and trust hardening needed for a credible SME launch.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Monorepo and API/Web Foundations** - Establish split frontend/backend architecture, FastAPI API, React web app, PostgreSQL, migrations, typed contracts, and modular boundaries.
- [ ] **Phase 2: Company Access and Tenant Foundation** - Deliver secure access, users, roles, multi-company isolation, UAE company settings, and base audit events.
- [ ] **Phase 3: Sales-to-Cash MVP** - Deliver customers, invoices, UAE VAT calculation, approvals, PDF invoices, payments, receivables, and record audit history.
- [ ] **Phase 4: Spend, Payables, and Accounting Core** - Deliver suppliers, expenses, supplier bills, attachments, payables, chart of accounts, and double-entry postings.
- [ ] **Phase 5: Reporting and Owner Dashboard** - Deliver VAT summary, owner dashboard, reporting tables, filters, drill-downs, and backend-derived tabular reporting.
- [ ] **Phase 6: Configuration, Theming, and Trust Hardening** - Deliver company theming, bilingual-ready structure, configurable fields/templates/workflows, and audited admin controls.

## Phase Details

### Phase 1: Monorepo and API/Web Foundations

**Goal**: Establish the one-repo, two-app foundation: FastAPI backend, React/Vite frontend, PostgreSQL persistence, migrations, API contracts, and modular backend boundaries.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: [ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, BACK-01, BACK-02, BACK-03, BACK-04, BACK-06, FRNT-01, FRNT-03, FRNT-04]
**Success Criteria** (what must be TRUE):

  1. Developers can run the backend and frontend as separate applications from one monorepo.
  2. Backend exposes typed API contracts consumed by the frontend without duplicating business logic.
  3. PostgreSQL, migrations, validation schemas, and backend module boundaries exist.
  4. The architecture explicitly avoids Phase 1 microservices while preserving extractable backend boundaries.

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 01-01: Monorepo workspace and development tooling

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02: FastAPI backend skeleton, PostgreSQL, migrations, and validation schema base

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03: React/Vite frontend shell and API client contract
- [ ] 01-04: Backend module boundaries and future AI/data extension points

### Phase 2: Company Access and Tenant Foundation

**Goal**: Create the secure company-scoped platform foundation: login, users, roles, permissions, company membership, UAE settings, and audit events.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, SETUP-01, SETUP-02, SETUP-03, SETUP-04, AUDT-01, AUDT-02, AUDT-04]
**Success Criteria** (what must be TRUE):

  1. User can sign in, access only authorized companies, and switch company context.
  2. Admin can invite users, assign roles, and manage company membership.
  3. Company records include AED, TRN, VAT registration status, and 5% VAT default settings.
  4. Backend rejects cross-company data, file, report, setting, and audit access attempts.
  5. Important actions create company-scoped audit events with actor, entity, action, timestamp, and change detail.

**Plans**: 4 plans

Plans:

- [ ] 02-01: Authentication, sessions, and user lifecycle
- [ ] 02-02: Company membership, switching, and tenant-scoped authorization
- [ ] 02-03: Roles, permissions, and cross-company negative tests
- [ ] 02-04: UAE company settings and base audit event model

### Phase 3: Sales-to-Cash MVP

**Goal**: Let a UAE SME manage customers, create VAT-aware invoices, approve them, render branded PDFs, record payments, and track receivables.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: [SETUP-05, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, SALE-01, SALE-02, SALE-03, SALE-04, SALE-05, SALE-06, SALE-07, SALE-08, SALE-09, AUDT-03]
**Success Criteria** (what must be TRUE):

  1. User can manage customers and suppliers needed for invoice workflows.
  2. User can create invoices with line items, due dates, UAE VAT, totals, and approval status.
  3. Authorized user can approve or reject invoices when approval workflow is enabled.
  4. User can generate printable PDF invoices with company logo, TRN, VAT amount, and totals.
  5. User can record invoice payments and see receivable status with audit history.

**Plans**: 5 plans

Plans:

- [ ] 03-01: Customer and supplier contact records
- [ ] 03-02: Invoice draft, line item, VAT, and total calculation flow
- [ ] 03-03: Invoice approval workflow and payment recording
- [ ] 03-04: Company logo handling and printable PDF invoices
- [ ] 03-05: Sales-to-cash audit history and receivables views

### Phase 4: Spend, Payables, and Accounting Core

**Goal**: Complete the daily finance loop with expenses, supplier bills, payables, chart of accounts, and double-entry postings for invoices, bills, and payments.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: [SPND-01, SPND-02, SPND-03, SPND-04, SPND-05, SPND-06, SPND-07, ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, ACCT-06, ACCT-07]
**Success Criteria** (what must be TRUE):

  1. User can record expenses and supplier bills with VAT treatment, attachments, due dates, payment status, and audit history.
  2. User can record full or partial payments against supplier bills and track payables.
  3. System provides a controlled UAE SME chart of accounts.
  4. Sales invoices, supplier bills, expenses, and payments create balanced double-entry accounting records.
  5. Posted financial records cannot be silently mutated and remain reconcilable to source documents.

**Plans**: 5 plans

Plans:

- [ ] 04-01: Supplier bill and expense capture
- [ ] 04-02: Attachments, purchase VAT, and payables tracking
- [ ] 04-03: Chart of accounts and controlled account management
- [ ] 04-04: Posting rules for invoices, bills, expenses, and payments
- [ ] 04-05: Accounting integrity, correction behavior, and reconciliation tests

### Phase 5: Reporting and Owner Dashboard

**Goal**: Give owners and finance users trustworthy visibility into VAT, receivables, payables, sales, expenses, and financial position using backend canonical data.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: [BACK-05, FRNT-02, RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, RPT-06]
**Success Criteria** (what must be TRUE):

  1. User can view a UAE VAT summary showing sales VAT, purchase VAT, and net VAT position.
  2. User can drill from VAT summary values into supporting invoices, bills, and expenses.
  3. User can view an owner-first dashboard showing receivables, payables, sales, expenses, and VAT position.
  4. Dashboard and reporting tables are filterable by company and date range.
  5. Report and dashboard figures come from backend canonical finance/accounting data.

**Plans**: 4 plans

Plans:

- [ ] 05-01: Backend reporting services and tabular report foundations
- [ ] 05-02: VAT summary report and source drill-downs
- [ ] 05-03: Owner dashboard metrics and visual hierarchy
- [ ] 05-04: Reporting filters, table UX, and reconciliation checks

### Phase 6: Configuration, Theming, and Trust Hardening

**Goal**: Add the platform flexibility and trust controls needed for launch: company theming, bilingual-ready structure, custom fields, numbering, templates, approval settings, and audited admin/config changes.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: [SETUP-06, SETUP-07, AUDT-05, CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06]
**Success Criteria** (what must be TRUE):

  1. Admin can configure company brand colors and document presentation settings.
  2. Application structure remains ready for future Arabic/RTL without shipping full Arabic UI in Phase 1.
  3. Admin can define typed custom fields and validate values on supported records.
  4. Admin can configure document numbering, invoice templates, and constrained approval workflow settings.
  5. Configuration, template, workflow, and admin changes are visible in audit history.

**Plans**: 4 plans

Plans:

- [ ] 06-01: Company theming and bilingual-ready UI/document structure
- [ ] 06-02: Typed custom fields and validation
- [ ] 06-03: Document numbering, templates, and presentation settings
- [ ] 06-04: Approval configuration and admin audit hardening

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo and API/Web Foundations | 1/4 | In Progress|  |
| 2. Company Access and Tenant Foundation | 0/4 | Not started | - |
| 3. Sales-to-Cash MVP | 0/5 | Not started | - |
| 4. Spend, Payables, and Accounting Core | 0/5 | Not started | - |
| 5. Reporting and Owner Dashboard | 0/4 | Not started | - |
| 6. Configuration, Theming, and Trust Hardening | 0/4 | Not started | - |
