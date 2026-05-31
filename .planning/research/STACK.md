# Stack Research

**Domain:** UAE-first cloud accounting and finance SaaS for SMEs
**Researched:** 2026-05-31
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.x LTS | JavaScript runtime | Current LTS line, suitable for production TypeScript apps and supported by the modern React/Next ecosystem. |
| TypeScript | 6.0.3 | Type-safe application code | Accounting, VAT, permissions, and audit flows need explicit domain types and compile-time checks. |
| Next.js | 16.2.6 | Full-stack web framework | Strong fit for cloud SaaS: routing, server rendering, server actions/API routes, and improved AI-assisted debugging via DevTools MCP in Next 16. |
| React | 19.2.6 | UI layer | Current React line used by Next 16; good fit for dashboard-heavy operational apps. |
| PostgreSQL | 18.x, or managed 17.x/18.x | Relational database | Accounting data is relational, transactional, and audit-sensitive. PostgreSQL has mature constraints, transactions, JSONB for configurable fields, and row-level security options. |
| Prisma ORM | 7.8.0 | Database schema, migrations, typed data access | Good developer velocity for a TypeScript SaaS; Prisma 7 supports PostgreSQL and ESM-first Node apps. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.4.3 | Runtime validation | Validate forms, API inputs, custom-field values, VAT/TRN settings, and workflow payloads. |
| Tailwind CSS | 4.3.0 | UI styling | Fast implementation of dense dashboards and forms while keeping design tokens centralized. |
| TanStack Query | 5.100.14 | Client-side server state | Use for dashboard widgets, async lists, and mutations where optimistic UI or caching is useful. |
| Playwright | 1.60.0 | End-to-end testing | Critical for invoice, approval, VAT, permission, and PDF workflows. |
| Vitest | 4.1.7 | Unit/integration testing | Use for accounting rules, VAT calculations, permissions, audit log behavior, and workflow logic. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + TypeScript strict mode | Code quality and type enforcement | Treat financial calculation code as high-risk; avoid implicit `any` and weak domain typing. |
| Prisma migrations | Database evolution | Require reviewed migrations for ledger, audit, and tenant isolation changes. |
| Playwright traces | Workflow debugging | Keep traces for failed tests around invoice creation, approvals, and permission boundaries. |
| Seed fixtures | Repeatable finance scenarios | Include UAE VAT invoices, exempt/non-taxable examples, supplier bills, partial payments, and multi-company fixtures. |

## Installation

```bash
# Core
npm install next@16 react@19 react-dom@19 @prisma/client@7 zod@4 @tanstack/react-query@5

# Styling
npm install tailwindcss@4

# Dev dependencies
npm install -D typescript@6 prisma@7 vitest@4 playwright@1
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js | SvelteKit | Use SvelteKit if the team strongly prefers Svelte and wants a lighter UI runtime. |
| Prisma | Drizzle ORM | Use Drizzle if migration transparency and SQL-first control matter more than Prisma's schema/client workflow. |
| PostgreSQL | MySQL | Use MySQL only if hosting constraints require it; PostgreSQL is stronger for relational integrity plus JSONB configurability. |
| Tailwind CSS | Component library-first stack | Use a full design system library only after validating the product's operational workflows and UI density needs. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Floating-point numbers for money | Rounding drift breaks accounting trust. | Integer minor units or fixed-decimal database fields with domain helpers. |
| Single-tenant assumptions | Multi-company privacy is core scope and hard to retrofit. | Tenant/company scoping in schema, queries, permissions, and tests from day one. |
| PDF-only invoice architecture | Official UAE eInvoicing guidance states PDFs/images/emails are not eInvoices. | Store structured invoice data first; generate PDF as a rendering/output. |
| Ad hoc audit messages | Weak audit records fail compliance and debugging needs. | Append-only audit events with actor, company, entity, action, before/after, timestamp, and request context. |
| Over-customized workflow engine in v1 | Can delay the first working finance loop. | Build constrained workflow primitives: statuses, approvals, custom fields, roles, templates. |

## Stack Patterns by Variant

**If deploying quickly with a small team:**
- Use a managed PostgreSQL provider and managed object storage.
- Keep the app as a modular monolith with clear domain boundaries.

**If enterprise/regulatory posture becomes a sales requirement:**
- Add formal backup/restore drills, immutable audit storage, tenant-level encryption options, and security evidence generation.

**If UAE eInvoicing becomes in-scope for smaller SMEs:**
- Add an eInvoice integration boundary around structured invoice documents, ASP/provider routing, statuses, and validation logs.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2.6 | React 19.2.x | Next 16 is built around the React 19 generation and App Router architecture. |
| Prisma 7.8.0 | Node 24.x, TypeScript 6.x | Prisma 7 is ESM-first; use `"type": "module"` and generated client imports. |
| PostgreSQL 18.x | Prisma 7.x | Use provider `postgresql`; store connection config via `prisma.config.ts`. |
| Tailwind CSS 4.x | Modern browsers | Good for a SaaS app targeting modern business browsers; test RTL readiness even before full Arabic UI. |

## Sources

- https://mof.gov.ae/en/public-finance/tax/value-added-tax-vat/ - UAE VAT rate, registration thresholds, and record-keeping expectations.
- https://mof.gov.ae/en/about-us/initiatives/einvoicing/ - UAE eInvoicing official portal and structured invoice definition.
- https://mof.gov.ae/en/news/ministry-of-finance-announces-targeted-amendments-to-einvoicing-system-decisions/ - 2026 eInvoicing deadline and AED 50m revenue scope.
- https://tax.gov.ae/DataFolder/Files/Guides/CT/Small%20Business%20Relief%20Guide%20-%20EN%20-%2027%2008%202023.pdf - corporate tax record retention and supporting documentation expectations.
- https://nodejs.org/es/about/previous-releases - Node.js LTS status.
- https://www.postgresql.org/ - PostgreSQL current supported releases and reliability positioning.
- https://nextjs.org/blog/next-16 - Next.js 16 release details.
- https://react.dev/versions - React latest major/minor line.
- https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7 - Prisma 7 prerequisites and ESM changes.
- npm registry checks on 2026-05-31 for Next.js, React, TypeScript, Prisma, Zod, Tailwind, TanStack Query, Playwright, and Vitest versions.

---
*Stack research for: UAE-first accounting SaaS*
*Researched: 2026-05-31*
