# Backend Architecture Contract

Phase 1 keeps the backend as one deployable FastAPI app with explicit Python package boundaries. The goal is a modular monolith: clear seams for later phases, no service-to-service hops, and no microservices in Phase 1.

## Where Code Belongs

- `app/main.py` owns app creation and process bootstrap only.
- `app/api/` owns HTTP transport adapters, routers, and response status decisions.
- `app/platform/` owns Phase 1 platform plumbing, including health checks and the workspace probe walking skeleton.
- `app/finance/` will hold customer-facing finance logic such as invoices, payments, and cash-flow workflows in later phases.
- `app/accounting/` will hold chart of accounts, postings, and reconciliation behavior in later phases.
- `app/reporting/` will hold VAT summaries, owner dashboards, exports, and other derived reporting in later phases.
- `app/workflow/` will hold approvals, transitions, and other constrained orchestration in later phases.
- `app/audit/` will hold append-only activity history and evidence trails in later phases.
- `app/integrations/` will hold external provider adapters such as eInvoicing and payment integrations in later phases.
- `app/ai/` will hold future AI/data services that consume normalized backend data without becoming Phase 1 product behavior.
- `app/db/` owns persistence infrastructure, SQLAlchemy models, repositories, and sessions.

## Current Phase 1 Shape

The current walking skeleton keeps the `/health` and `/workspace-probe` endpoint behavior anchored in the platform boundary, while `app/api/routes/` remains a thin transport layer.

- `platform.health` builds the health response from injected settings.
- `platform.workspace_probe` owns the request and response schemas for the probe flow and calls the repository layer.
- The probe table proves the database write/read path and is not a business feature.

## Rules

- Keep Phase 1 as a single backend deployable.
- Do not introduce internal HTTP calls, separate worker services, or network seams between these packages.
- Keep authoritative finance, accounting, audit, and VAT logic out of the frontend.
- Add future finance/reporting/workflow/audit/integrations/ai behavior in the named boundary packages instead of reusing generic utility buckets.
- If AI or reporting needs normalized finance data later, add that behavior under `app/ai/` or `app/reporting/` without reshaping the repository into microservices.
