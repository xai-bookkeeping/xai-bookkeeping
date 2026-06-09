# Requirements: XAI Books

**Defined:** 2026-05-31
**Core Value:** SME owners in the UAE can run daily finance confidently in one simple, trustworthy, UAE-first system without needing enterprise complexity or long training.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Monorepo Architecture

- [x] **ARCH-01**: The project is organized as a monorepo containing separate frontend and backend applications.
- [x] **ARCH-02**: The frontend and backend can be developed, tested, and deployed as separate applications from the monorepo.
- [x] **ARCH-03**: The backend exposes stable API contracts that the frontend can consume without duplicating backend business rules.
- [x] **ARCH-04**: Backend modules are organized around clear boundaries for platform, finance, accounting, reporting, workflow, audit, integrations, and future AI/data services.
- [x] **ARCH-05**: The architecture avoids Phase 1 microservices while preserving boundaries that can be extracted later if scale or ownership requires it.

### Backend Foundation

- [x] **BACK-01**: Backend API is implemented with FastAPI.
- [x] **BACK-02**: Backend persistence uses PostgreSQL.
- [x] **BACK-03**: Backend database access and migrations use SQLAlchemy and Alembic or an equivalent reviewed migration workflow.
- [x] **BACK-04**: Backend validation uses typed request and response schemas.
- [ ] **BACK-05**: Backend services support tabular reporting/export workflows without placing finance logic in the frontend.
- [x] **BACK-06**: Backend design leaves a clear path for later AI/data-heavy features without making AI part of the Phase 1 core.

### Frontend Foundation

- [x] **FRNT-01**: Frontend application is implemented as a separate web app in the monorepo.
- [ ] **FRNT-02**: Frontend supports dense operational screens for dashboards, forms, and tabular finance data.
- [x] **FRNT-03**: Frontend consumes backend APIs through typed or generated contracts.
- [x] **FRNT-04**: Frontend does not perform authoritative VAT, ledger, permission, or audit writes client-side.

### Platform Access

- [x] **AUTH-01**: User can securely sign in.
- [ ] **AUTH-02**: Admin can invite and manage users.
- [ ] **AUTH-03**: Admin can assign users to company roles.
- [ ] **AUTH-04**: Role-based permissions control access to viewing, creating, editing, approving, deleting, exporting, and configuring records.
- [x] **AUTH-05**: User session handling prevents unauthorized access to company finance data.

### Multi-Company

- [x] **COMP-01**: User can belong to more than one company.
- [x] **COMP-02**: User can switch between companies they are authorized to access.
- [x] **COMP-03**: Each company's business data is private from every other company.
- [x] **COMP-04**: Company-scoped files, reports, dashboards, settings, and audit events cannot be accessed by users outside that company.
- [x] **COMP-05**: Cross-company access attempts are rejected by backend authorization, not only hidden in the UI.

### Company Setup and Theming

- [x] **SETUP-01**: Admin can create and edit company profile details.
- [ ] **SETUP-02**: Company profile supports AED currency as the default Phase 1 currency.
- [ ] **SETUP-03**: Company profile supports UAE TRN fields.
- [ ] **SETUP-04**: Company settings support UAE VAT registration status and 5% VAT default.
- [ ] **SETUP-05**: Company can upload and use a logo on relevant documents.
- [ ] **SETUP-06**: Company can configure basic theme settings such as brand colors for app presentation and customer-facing documents.
- [ ] **SETUP-07**: Application structure is bilingual-ready for future Arabic/RTL support while Phase 1 UI launches in English.

### Contacts

- [ ] **CONT-01**: User can create and edit customer records.
- [ ] **CONT-02**: User can create and edit supplier records.
- [ ] **CONT-03**: Customer and supplier records support TRN, address, contact details, and payment terms.
- [ ] **CONT-04**: User can search, filter, and view customer and supplier lists.
- [ ] **CONT-05**: Customer and supplier changes are recorded in the activity/audit log.

### Sales-to-Cash

- [ ] **SALE-01**: User can create sales invoices with customer, line items, quantities, prices, discounts where supported, and due dates.
- [ ] **SALE-02**: Invoice VAT is calculated automatically using UAE VAT settings and line-level tax treatment.
- [ ] **SALE-03**: Invoice totals store subtotal, VAT, total, amount paid, and balance due.
- [ ] **SALE-04**: User can submit invoices for approval when approval workflow is enabled.
- [ ] **SALE-05**: Authorized user can approve or reject invoices.
- [ ] **SALE-06**: User can generate printable PDF invoices with company logo, company details, TRN, invoice number, invoice date, VAT amount, and total.
- [ ] **SALE-07**: User can record full or partial payments against invoices.
- [ ] **SALE-08**: User can track invoice payment status and receivables.
- [ ] **SALE-09**: Invoice creation, edits, approvals, PDF generation, and payments are recorded in the activity/audit log.

### Spend and Payables

- [ ] **SPND-01**: User can record expenses.
- [ ] **SPND-02**: User can create supplier bills with supplier, line items, VAT treatment, due date, and status.
- [ ] **SPND-03**: Expense and bill VAT is captured for purchase VAT reporting.
- [ ] **SPND-04**: User can attach supporting documents to expenses and supplier bills.
- [ ] **SPND-05**: User can record full or partial payments against supplier bills.
- [ ] **SPND-06**: User can track bill payment status and payables.
- [ ] **SPND-07**: Expense and supplier bill creation, edits, attachments, and payments are recorded in the activity/audit log.

### Accounting Core

- [ ] **ACCT-01**: System provides a chart of accounts suitable for UAE SME bookkeeping.
- [ ] **ACCT-02**: Authorized user can view and manage chart of accounts entries within controlled rules.
- [ ] **ACCT-03**: Approved/posted sales invoices generate balanced double-entry accounting records.
- [ ] **ACCT-04**: Supplier bills and expenses generate balanced double-entry accounting records.
- [ ] **ACCT-05**: Invoice and bill payments generate balanced double-entry accounting records.
- [ ] **ACCT-06**: Posted financial records cannot be silently mutated without traceable correction behavior.
- [ ] **ACCT-07**: Accounting postings are testable and reconcilable to source business documents.

### Reporting

- [ ] **RPT-01**: User can view a UAE VAT summary report showing sales VAT, purchase VAT, and net VAT position.
- [ ] **RPT-02**: VAT summary report links back to supporting invoices, bills, and expenses.
- [ ] **RPT-03**: User can view an owner-first financial dashboard.
- [ ] **RPT-04**: Dashboard shows receivables, payables, sales, expenses, and VAT position.
- [ ] **RPT-05**: Dashboard figures are derived from backend canonical finance/accounting data.
- [ ] **RPT-06**: User can filter key reports and tables by company and date range.

### Trust and Audit

- [ ] **AUDT-01**: System records activity/audit events for important create, update, delete, approval, payment, configuration, permission, and login-related actions.
- [ ] **AUDT-02**: Audit events include actor, company, entity, action, timestamp, and meaningful change details.
- [ ] **AUDT-03**: Authorized user can view audit history for key records.
- [ ] **AUDT-04**: Audit history is company-scoped and inaccessible to unauthorized users.
- [ ] **AUDT-05**: Admin/configuration changes are included in audit history.

### Configuration

- [ ] **CONF-01**: Admin can define typed custom fields for supported records.
- [ ] **CONF-02**: Custom fields validate user input according to their configured type and rules.
- [ ] **CONF-03**: Admin can configure invoice numbering or document numbering rules.
- [ ] **CONF-04**: Admin can configure basic invoice templates and document presentation settings.
- [ ] **CONF-05**: Admin can configure constrained approval workflow settings for invoices.
- [ ] **CONF-06**: Configurable fields, templates, and workflows are audited when changed.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Localization

- **LOCL-01**: User can switch the full application interface between English and Arabic.
- **LOCL-02**: Application supports full RTL layout for Arabic UI.
- **LOCL-03**: Company can generate Arabic or bilingual customer-facing documents.

### Advanced Finance

- **ADVF-01**: User can import bank transactions.
- **ADVF-02**: User can reconcile bank transactions against invoices, bills, and expenses.
- **ADVF-03**: User can create recurring invoices.
- **ADVF-04**: User can create recurring expenses or bills.
- **ADVF-05**: User can manage multi-currency transactions.
- **ADVF-06**: User can manage inventory-linked accounting.
- **ADVF-07**: User can run corporate tax filing workflows.

### Integrations and Intelligence

- **INTG-01**: System integrates with UAE eInvoicing providers when target customers and regulatory scope require it.
- **INTG-02**: System integrates with payment providers for online invoice payments.
- **INTG-03**: System provides AI-assisted transaction categorization, document extraction, or finance insights.
- **INTG-04**: System can extract reporting, document generation, AI, or eInvoicing into separate services when scale requires it.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full Arabic/RTL application UI in Phase 1 | Architecture must be bilingual-ready, but full localization is deferred. |
| Broad XAI platform modules beyond XAI Books | Phase 1 proves the platform through accounting and finance first. |
| Microservice architecture in Phase 1 | Backend should be modular, but distributed services add overhead before domain boundaries are proven. |
| Inventory management | Valuable later, but not required for the first daily finance loop. |
| Payroll | UAE-specific complexity is high and outside the first accounting launch. |
| Bank feeds and reconciliation | Important future workflow, but invoices, bills, payments, ledger, VAT, and dashboard come first. |
| Corporate tax filing workflow | VAT/daily bookkeeping is the first compliance priority. |
| Full UAE eInvoicing ASP integration | Structured invoice readiness is in scope; provider integration is deferred until needed. |
| Multi-currency accounting | AED-first Phase 1 keeps complexity lower for UAE SMEs. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 1 | Complete |
| ARCH-04 | Phase 1 | Complete |
| ARCH-05 | Phase 1 | Complete |
| BACK-01 | Phase 1 | Complete |
| BACK-02 | Phase 1 | Complete |
| BACK-03 | Phase 1 | Complete |
| BACK-04 | Phase 1 | Complete |
| BACK-05 | Phase 5 | Pending |
| BACK-06 | Phase 1 | Complete |
| FRNT-01 | Phase 1 | Complete |
| FRNT-02 | Phase 5 | Pending |
| FRNT-03 | Phase 1 | Complete |
| FRNT-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| COMP-05 | Phase 2 | Complete |
| SETUP-01 | Phase 2 | Complete |
| SETUP-02 | Phase 2 | Pending |
| SETUP-03 | Phase 2 | Pending |
| SETUP-04 | Phase 2 | Pending |
| SETUP-05 | Phase 3 | Pending |
| SETUP-06 | Phase 6 | Pending |
| SETUP-07 | Phase 6 | Pending |
| CONT-01 | Phase 3 | Pending |
| CONT-02 | Phase 3 | Pending |
| CONT-03 | Phase 3 | Pending |
| CONT-04 | Phase 3 | Pending |
| CONT-05 | Phase 3 | Pending |
| SALE-01 | Phase 3 | Pending |
| SALE-02 | Phase 3 | Pending |
| SALE-03 | Phase 3 | Pending |
| SALE-04 | Phase 3 | Pending |
| SALE-05 | Phase 3 | Pending |
| SALE-06 | Phase 3 | Pending |
| SALE-07 | Phase 3 | Pending |
| SALE-08 | Phase 3 | Pending |
| SALE-09 | Phase 3 | Pending |
| SPND-01 | Phase 4 | Pending |
| SPND-02 | Phase 4 | Pending |
| SPND-03 | Phase 4 | Pending |
| SPND-04 | Phase 4 | Pending |
| SPND-05 | Phase 4 | Pending |
| SPND-06 | Phase 4 | Pending |
| SPND-07 | Phase 4 | Pending |
| ACCT-01 | Phase 4 | Pending |
| ACCT-02 | Phase 4 | Pending |
| ACCT-03 | Phase 4 | Pending |
| ACCT-04 | Phase 4 | Pending |
| ACCT-05 | Phase 4 | Pending |
| ACCT-06 | Phase 4 | Pending |
| ACCT-07 | Phase 4 | Pending |
| RPT-01 | Phase 5 | Pending |
| RPT-02 | Phase 5 | Pending |
| RPT-03 | Phase 5 | Pending |
| RPT-04 | Phase 5 | Pending |
| RPT-05 | Phase 5 | Pending |
| RPT-06 | Phase 5 | Pending |
| AUDT-01 | Phase 2 | Pending |
| AUDT-02 | Phase 2 | Pending |
| AUDT-03 | Phase 3 | Pending |
| AUDT-04 | Phase 2 | Pending |
| AUDT-05 | Phase 6 | Pending |
| CONF-01 | Phase 6 | Pending |
| CONF-02 | Phase 6 | Pending |
| CONF-03 | Phase 6 | Pending |
| CONF-04 | Phase 6 | Pending |
| CONF-05 | Phase 6 | Pending |
| CONF-06 | Phase 6 | Pending |

**Coverage:**

- v1 requirements: 77 total
- Mapped to phases: 77
- Unmapped: 0

---
*Requirements defined: 2026-05-31*
*Last updated: 2026-05-31 after roadmap creation*
