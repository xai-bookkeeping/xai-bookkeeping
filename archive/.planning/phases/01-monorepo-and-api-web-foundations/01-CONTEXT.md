# Phase 1: Monorepo and API/Web Foundations - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the structural foundation: monorepo directory layout, FastAPI backend skeleton with PostgreSQL + Alembic migrations + Pydantic validation, React/Vite frontend shell, typed OpenAPI codegen-based API contracts, and modular backend boundaries with AI/data extension points. No business features are delivered in this phase — only the scaffolding all future phases build on.

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure
- **D-01:** `backend/` and `frontend/` live flat at the repo root — no `apps/` layer, no workspace manager overhead.
- **D-02:** No shared directory — typed contracts originate in the backend (via OpenAPI spec + codegen). The frontend imports generated types; no shared runtime code is needed in Phase 1.
- **D-03:** Root-level Docker Compose file coordinates the full stack (DB + backend + frontend as containers).
- **D-04:** Shared tooling config lives at root: `.github/` for CI, `.eslintrc` (or `eslint.config.js`) for frontend linting, `pyproject.toml` for backend Python tooling. Each app may extend root configs.

### API Contract Mechanism
- **D-05:** FastAPI auto-generates an OpenAPI spec. A codegen tool (e.g., `openapi-ts` or `orval`) generates a typed TypeScript client from that spec. The frontend consumes only generated types and client functions — no manual type duplication.
- **D-06:** Codegen is triggered manually via a `make gen-types` (or equivalent) script. Developer runs it after backend API changes.
- **D-07:** Generated files live at `frontend/src/api/` (generated client + types together).
- **D-08:** Generated files are committed to git so they appear in diffs and are accessible to agents without a codegen run.

### Frontend UI Foundation
- **D-09:** Component library: **shadcn/ui** (components copied into `frontend/src/components/ui/`). Styling: **Tailwind CSS**.
- **D-10:** Routing: **React Router v6**. Nested routes used for app shell + per-section layouts.
- **D-11:** Server state (API data fetching + caching): **TanStack Query (React Query)**.

### Frontend Component Architecture
- **D-15:** Frontend shared UI must follow atomic component design strictly. Shared UI lives under `frontend/src/components/` only, with explicit `atoms/`, `molecules/`, `organisms/`, and `templates/` directories.
- **D-16:** Page and screen composition lives in `frontend/src/routes/`. Do not create top-level per-page, per-route, or per-feature component silos under `frontend/src/components/`.

### Local Development Setup
- **D-12:** Everything runs in Docker Compose: PostgreSQL, FastAPI backend, and Vite frontend — all as containers. Full isolation, consistent across machines.
- **D-13:** Hot reload via volume mounts: source directories mounted into containers. Backend uses `uvicorn --reload`; frontend uses Vite HMR through the mounted volume. No container rebuild needed for code changes.
- **D-14:** Environment configuration via a single `.env` file at the repo root. Docker Compose reads it via `env_file`. `.env` is gitignored; `.env.example` is committed with safe placeholder values.

### Claude's Discretion
- Specific codegen tool selection (openapi-ts vs. orval vs. another): researcher picks the best fit for FastAPI + React/Vite + TanStack Query.
- Python version and virtual environment tooling inside the backend container.
- Node version and package manager (npm vs. pnpm) for the frontend.
- Port assignments for local services.
- Backend module boundary internal structure (folder layout within `backend/`) — planner decides based on ARCH-04 requirements.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Foundation
- `.planning/PROJECT.md` — Core value, constraints, key decisions (FastAPI, PostgreSQL, monorepo, no microservices, UAE-first). Read this first.
- `.planning/REQUIREMENTS.md` — Full v1 requirements. Phase 1 covers: ARCH-01–05, BACK-01–04, BACK-06, FRNT-01, FRNT-03, FRNT-04.
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and 4-plan breakdown.

### No external specs
No ADRs, design docs, or external specs exist yet — this is Phase 1 of a greenfield project. Requirements are fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — the codebase is empty (greenfield). Phase 1 creates the foundation.

### Established Patterns
- None yet — Phase 1 establishes the patterns all subsequent phases follow.

### Integration Points
- Everything in Phase 1 is a new creation. Later phases (Phase 2+) will integrate into the FastAPI app, React shell, and Alembic migration history established here.

</code_context>

<specifics>
## Specific Ideas

- The frontend shell only needs to demonstrate the React Router + TanStack Query + shadcn/ui + Tailwind stack wired up — no real screens yet. A placeholder authenticated shell is sufficient.
- The frontend filesystem should enforce the atomic split early so future phases do not drift into page-specific component trees inside `frontend/src/components/`.
- The backend only needs the FastAPI app bootstrapped, PostgreSQL connected, Alembic migrations running, and one health/ping endpoint — no domain models yet.
- The codegen pipeline (`make gen-types`) needs to work end-to-end: backend serves OpenAPI spec → codegen tool produces TS client at `frontend/src/api/` → frontend can import types.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Monorepo and API/Web Foundations*
*Context gathered: 2026-06-04*
