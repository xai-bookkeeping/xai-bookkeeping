# XAI Books

## What This Is

XAI is a cloud-based business management platform for small and medium-sized businesses in the UAE. It is designed to be modern, affordable, modular, and easy to use, so businesses can start with one application and add more over time as they grow.

XAI Books is the first application in the platform: a complete accounting and finance management solution for UAE SMEs. Phase 1 focuses on the daily finance loop, giving owners and operators a simple way to manage invoices, payments, customers, suppliers, expenses, approvals, VAT, and financial visibility while still maintaining a proper accounting foundation underneath.

## Core Value

SME owners in the UAE can run daily finance confidently in one simple, trustworthy, UAE-first system without needing enterprise complexity or long training.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Secure login and user management.
- [ ] Multi-company support where each company's data is fully private.
- [ ] Customer and supplier management.
- [ ] Invoice creation with automatic UAE VAT calculation at 5%.
- [ ] Payment recording and payment tracking.
- [ ] Expense and supplier bill management.
- [ ] Approval workflows for invoices.
- [ ] Chart of accounts and double-entry bookkeeping foundation.
- [ ] VAT summary report for UAE businesses.
- [ ] Printable PDF invoices with company logo and VAT number.
- [ ] Real-time financial dashboard for business owners.
- [ ] Full activity and audit log showing who did what, when, and what changed.
- [ ] UAE-first business defaults, including AED currency, TRN fields, and VAT-aware records.
- [ ] Bilingual-ready architecture, with English launch UI and future support for Arabic/RTL.
- [ ] Configurable platform foundation for custom fields, roles, permissions, templates, workflows, modules, and audit rules.

### Out of Scope

- Full Arabic/RTL interface in Phase 1 - the launch UI is English, but the architecture should be bilingual-ready.
- Broad XAI platform modules beyond XAI Books - Phase 1 proves the platform through the accounting and finance module first.
- Enterprise ERP complexity - the product must remain simple and approachable for SMEs.
- Training-heavy workflows - the interface should be learnable quickly by owners and operators.

## Context

XAI is intended for small and medium-sized businesses in the UAE that need practical business software without the cost, rigidity, or complexity of large enterprise systems. The broader platform is modular: businesses should be able to adopt XAI Books first and add other business applications over time.

The first launched application is XAI Books. It should combine daily operational finance with a reliable accounting backbone. The product should feel owner-first: invoices, payments, expenses, suppliers, customers, VAT status, and dashboards should be understandable to a non-accountant. At the same time, finance staff and external accountants should have enough structure underneath to trust the records, including chart of accounts, double-entry bookkeeping, approval trails, and audit history.

The product principles are:

- UAE-First: Built for UAE businesses, including VAT at 5%, TRN fields, AED currency, and bilingual-ready architecture.
- Simple & Modern: Clean, fast, and easy to learn without lengthy training.
- Configurable: Businesses can adjust fields, workflows, approval steps, roles, permissions, templates, and platform behavior to match how they work.
- Trustworthy: Every important action is logged, including who did it, when it happened, and what changed.

Phase 1 should prove that an SME owner can run the full daily finance loop in XAI Books while the system quietly maintains accounting correctness and compliance-oriented records.

## Constraints

- **Market**: UAE SMEs are the primary launch audience - VAT, TRN, AED, and local business expectations must shape defaults.
- **User Experience**: Owner-first usability - the product should avoid unnecessary accounting jargon where simple language works.
- **Accounting Integrity**: Double-entry bookkeeping and chart of accounts must exist under the simple interface - trust depends on records being structurally correct.
- **Privacy**: Multi-company support must keep each company's data fully private - cross-company leakage is unacceptable.
- **Compliance Readiness**: VAT-aware invoices, VAT summary reporting, audit logs, and document evidence must be designed from the start.
- **Internationalization**: Phase 1 launches in English but must not block future Arabic and RTL support.
- **Platform Direction**: XAI Books should be built as the first module of a configurable modular platform, not as an isolated one-off app.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Launch with XAI Books as the first XAI module | Accounting and finance is the first concrete business need to solve for UAE SMEs | - Pending |
| Optimize Phase 1 for owner-first daily finance workflows | SME owners need to understand and run the business without deep accounting training | - Pending |
| Include finance staff and accountant needs underneath the owner-first UX | The system still needs proper accounting structure, reports, approvals, and auditability | - Pending |
| Treat UAE-first behavior as core scope | VAT at 5%, TRN fields, AED, and UAE business expectations are differentiators, not add-ons | - Pending |
| Make the UI bilingual-ready but launch in English | Arabic/RTL support is important, but full bilingual UI is not required for Phase 1 | - Pending |
| Build configurable fields and admin/platform controls into the foundation | XAI is intended as a modular business platform that adapts to business workflows over time | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-31 after initialization*
