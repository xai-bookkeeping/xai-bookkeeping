# Pitfalls Research

**Domain:** UAE-first cloud accounting and finance SaaS for SMEs
**Researched:** 2026-05-31
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Treating Finance Data Like Ordinary CRUD

**What goes wrong:**
Invoices, bills, payments, and reports appear to work, but totals, VAT, receivables, payables, and accounting records diverge once edits, approvals, partial payments, and reversals appear.

**Why it happens:**
Teams optimize for fast screens and postpone ledger/posting rules.

**How to avoid:**
Define posting rules early. Use immutable or reversible accounting records for posted documents. Test every business event for balanced debits and credits.

**Warning signs:**
Dashboard totals are calculated differently from reports; no journal entries exist; edits mutate posted financial facts without reversal.

**Phase to address:**
Foundation and first invoice/expense phases.

---

### Pitfall 2: Weak Multi-Company Isolation

**What goes wrong:**
Users can accidentally view or mutate records from another company through URLs, APIs, exports, files, dashboards, or background jobs.

**Why it happens:**
Tenant scoping is added as UI filtering instead of being part of schema, authorization, file access, and tests.

**How to avoid:**
Make company scope mandatory for business records. Add permission policies and integration tests that attempt cross-company reads/writes.

**Warning signs:**
Queries do not include company context; file URLs are not scoped; tests only cover happy-path access.

**Phase to address:**
First platform foundation phase.

---

### Pitfall 3: VAT Rules Hidden in UI Logic

**What goes wrong:**
VAT totals differ between invoices, expenses, reports, and exports because calculations are duplicated or rounded differently.

**Why it happens:**
Developers calculate VAT in form components for speed, then reimplement the logic elsewhere.

**How to avoid:**
Centralize tax code and VAT calculation helpers server-side. Store line-level VAT data and totals. Test rounding, discounts, exempt/non-taxable cases, and edits.

**Warning signs:**
VAT calculation code appears in React components; tests only check the default 5% case.

**Phase to address:**
Invoice and expense phases.

---

### Pitfall 4: Confusing PDF Invoices with eInvoices

**What goes wrong:**
The product produces beautiful PDFs but cannot support structured eInvoice exchange when required.

**Why it happens:**
PDF rendering is easier to demo than structured invoice modeling.

**How to avoid:**
Store complete structured invoice data as the source of truth and render PDFs from it. Keep provider-neutral eInvoice identifiers/status fields available for future integration.

**Warning signs:**
Important invoice data only exists in generated PDF text or template strings.

**Phase to address:**
Invoice architecture phase.

---

### Pitfall 5: Overbuilding Configurability

**What goes wrong:**
Custom workflows, fields, and roles become so flexible that support, testing, and accounting correctness suffer.

**Why it happens:**
"Configurable" gets interpreted as a general-purpose workflow engine.

**How to avoid:**
Start with constrained primitives: typed custom fields, role permissions, approval steps, document statuses, numbering, templates, and audit rules.

**Warning signs:**
Users can create states that accounting workflows do not understand; custom fields lack types; permissions cannot be explained in one screen.

**Phase to address:**
Platform configuration phase.

---

### Pitfall 6: Owner-First UX That Hides Too Much

**What goes wrong:**
Owners like the UI, but accountants cannot verify the books, audit trail, or reports.

**Why it happens:**
The app removes accounting concepts instead of translating them.

**How to avoid:**
Use plain language in daily workflows while keeping drill-downs to ledger entries, VAT details, approvals, and audit history.

**Warning signs:**
No way to see why a dashboard number changed; accountants need database access to verify records.

**Phase to address:**
Dashboard/reporting phase and every workflow phase.

---

### Pitfall 7: Starting With Microservices Too Early

**What goes wrong:**
The team spends Phase 1 solving deployment, distributed transactions, cross-service permissions, schema ownership, and observability instead of proving the finance product.

**Why it happens:**
Microservices feel like the natural destination for a growing business platform, so the architecture jumps there before the domain boundaries are validated.

**How to avoid:**
Use a monorepo with a separate frontend and FastAPI backend. Keep backend modules internally separated around platform, finance, accounting, reporting, workflow, audit, and future AI/data services. Extract services only when scale, ownership, or performance pressure makes the boundary obvious.

**Warning signs:**
Separate services are introduced before the first invoice/bill/ledger flow is production-ready; distributed events appear before the accounting transaction model is stable.

**Phase to address:**
Foundation and every architecture review.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store money as floating point | Faster early implementation | Rounding errors and broken trust | Never |
| Skip audit before/after diffs | Faster CRUD | Cannot answer what changed | Only for non-sensitive settings, and even then log actor/action |
| Hard-code one company per user | Simpler auth | Blocks multi-company support | Never for this project |
| Build generic JSON fields without metadata | Quick custom fields | Poor validation/search/reporting | Only for internal prototypes |
| Dashboard from raw operational rows only | Quick charts | Slow or inconsistent reports | Acceptable briefly if backed by tests and replaced with summary views |
| Split into microservices before domain boundaries are stable | Feels scalable | Distributed complexity, harder accounting consistency | Not acceptable for Phase 1 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PDF generation | Treat PDF as canonical invoice | Generate PDF from structured invoice data |
| Object storage | Store attachments with unscoped public links | Use private storage, company-scoped metadata, signed access |
| Email | Send invoices before approval/posting rules are clear | Gate sending through document status and audit events |
| Future eInvoicing | Assume PDF/email is enough | Follow official structured invoice direction and maintain provider-neutral data |
| Future payments | Mark invoices paid from provider webhooks without reconciliation | Use idempotent payment events and clear matching rules |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Dashboard queries scanning all invoices/bills | Slow dashboard as company data grows | Company/date indexes, summary tables, materialized views | Hundreds of thousands of documents |
| Audit log in one unindexed table | Slow activity pages and exports | Index company/entity/time; plan partitioning | High write volume or many companies |
| PDF generation in request path | Slow invoice approval/send actions | Queue PDF rendering and cache generated files | Larger invoices or concurrent sends |
| Permission checks per row after fetching | Slow lists and leakage risk | Apply authorization in query/policy layer | Multi-company datasets |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Cross-company access through IDs | Financial data breach | Company-scoped authorization and negative tests |
| Editable posted records without reversal | Tampered books | Lock posted documents; allow corrections through credit notes/reversals/adjustments |
| Missing audit for admin changes | Undetectable permission/workflow abuse | Audit role, permission, workflow, tax, and company-setting changes |
| Weak file access controls | Invoice/bill PDFs leak | Private object storage and scoped signed URLs |
| Overbroad admin role | Accidental or malicious changes | Fine-grained permissions and approval separation |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Accounting jargon everywhere | Owners feel the product is not for them | Use plain labels with accountant drill-downs |
| Too many setup steps before first invoice | Users abandon onboarding | Guided company setup with sensible UAE defaults |
| Configurability shown too early | Users feel overwhelmed | Progressive settings: defaults first, advanced config later |
| Dashboard without explanations | Owners cannot trust numbers | Make dashboard cards clickable with source records |
| Approval workflow too rigid | SMEs cannot match real operations | Simple configurable approval steps and role-based actions |

## "Looks Done But Isn't" Checklist

- [ ] **Invoices:** Often missing line-level VAT treatment, TRN fields, status transitions, PDF regeneration rules, and approval/send gating.
- [ ] **Payments:** Often missing partial payments, overpayments, audit events, and receivable balance updates.
- [ ] **Expenses/bills:** Often missing supplier bill vs cash expense distinction, attachment permissions, and purchase VAT handling.
- [ ] **Dashboard:** Often missing reconciliation against ledger/report sources.
- [ ] **Audit log:** Often missing before/after diffs and admin/config changes.
- [ ] **Multi-company:** Often missing file, export, dashboard, and background job isolation.
- [ ] **Configurable fields:** Often missing validation, permissioning, and report/export behavior.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Missing ledger foundation | HIGH | Freeze finance scope, design posting rules, migrate historical documents into journal entries, reconcile reports. |
| Weak tenant isolation | HIGH | Security audit, add company scope constraints, rotate exposed files/links if needed, add negative tests. |
| Duplicated VAT logic | MEDIUM | Centralize VAT engine, backfill line-level tax data, add report/invoice consistency tests. |
| PDF-only invoices | MEDIUM/HIGH | Extract structured fields, rebuild invoice model, regenerate PDFs from canonical data. |
| Overbuilt workflow engine | MEDIUM | Constrain supported states/actions, migrate unsupported configs, simplify UI. |
| Premature microservices | HIGH | Collapse early services back behind clear module boundaries, stabilize domain transactions, re-extract only proven boundaries. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Weak multi-company isolation | Platform foundation | Cross-company negative tests for records, files, dashboards, APIs |
| Treating finance as CRUD | Accounting foundation | Balanced journal-entry tests for invoices, bills, payments |
| VAT rules hidden in UI | Sales/expense workflows | Shared VAT calculation tests and report reconciliation |
| PDF vs eInvoice confusion | Invoice workflow | Structured invoice data exists before PDF generation |
| Overbuilt configurability | Configuration foundation | Only approved typed field/workflow primitives are available |
| Owner UX hides too much | Dashboard/reporting | Every dashboard metric drills into source records |
| Premature microservices | Foundation | Frontend/backend are split, but backend starts as modular FastAPI app with clear internal boundaries |

## Sources

- https://mof.gov.ae/en/public-finance/tax/value-added-tax-vat/ - VAT and record-keeping expectations.
- https://mof.gov.ae/en/about-us/initiatives/einvoicing/ - PDF/email are not structured eInvoices; official eInvoicing source.
- https://mof.gov.ae/en/news/ministry-of-finance-issues-uae-electronic-invoicing-guidelines-to-support-national-rollout/ - eInvoicing readiness, governance, penalties, and phased rollout context.
- https://mof.gov.ae/en/news/ministry-of-finance-announces-targeted-amendments-to-einvoicing-system-decisions/ - 2026/2027 eInvoicing scope and timeline for larger entities.
- https://tax.gov.ae/DataFolder/Files/Guides/CT/Small%20Business%20Relief%20Guide%20-%20EN%20-%2027%2008%202023.pdf - supporting records and seven-year retention requirement.
- Competitor feature research from Wafeq, QuickBooks UAE, Zoho Books UAE, and Xero.

---
*Pitfalls research for: UAE-first accounting SaaS*
*Researched: 2026-05-31*
