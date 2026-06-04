---
phase: 01-monorepo-and-api-web-foundations
verified: 2026-06-04T11:09:41Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  gaps_closed:
    - "Frontend and backend can be developed, tested, and deployed as separate applications from the monorepo"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Start `make dev`, edit one backend file and one frontend file, and confirm both containers reload without rebuilding."
    expected: "Backend and frontend changes should be reflected through watch/reload behavior, not a full image rebuild."
    why_human: "The validation contract marks hot-reload behavior as observation-based, and this re-verification did not mutate source files."
  - test: "Open `http://localhost:5173/workspace`, confirm the health panel shows API healthy, then click Run Workspace Probe and verify the latest probe panel updates."
    expected: "The route should render live health data and refresh the latest probe after the POST succeeds."
    why_human: "Browser-level user-flow completion and rendered UI state transitions are not fully proven by the mocked Vitest smoke test."
---

# Phase 1: Monorepo and API/Web Foundations Verification Report

**Phase Goal:** Establish the one-repo, two-app foundation: FastAPI backend, React/Vite frontend, PostgreSQL persistence, migrations, API contracts, and modular backend boundaries.
**Verified:** 2026-06-04T11:09:41Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure

## Goal Achievement

MVP-mode note: `ROADMAP.md` still marks this phase as `Mode: mvp`, but the Phase 1 goal text is not written as a user story. This blocks strict MVP user-flow verification, so this report verifies the technical success criteria against the live repo instead.

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The repo is a one-monorepo/two-app foundation with flat `backend/` and `frontend/` roots. | ✓ VERIFIED | Root tree still uses `backend/` and `frontend/` directly; no `apps/` wrapper was introduced. |
| 2 | Developers can run the backend and frontend from one documented repo-root workflow. | ✓ VERIFIED | `rtk make verify-stack`, `rtk make test-backend`, `rtk make migrate-backend`, `rtk make gen-types`, and `rtk make test-frontend` all exited `0`. |
| 3 | The frontend and backend can be developed, tested, and deployed as separate applications from the monorepo. | ✓ VERIFIED | `frontend/Dockerfile:11-12` now copies `index.html`, config, and `src/`; `backend/Dockerfile:14-17` now copies `alembic.ini`, `app/`, `migrations/`, and `tests/`; `Makefile:40-42` adds `verify-images`; `rtk make verify-images` exited `0`; direct no-bind-mount runs succeeded for `npm run build` and `alembic upgrade head`. |
| 4 | Backend typed API contracts are the source of truth. | ✓ VERIFIED | `backend/app/api/routes/health.py:9` and `backend/app/api/routes/workspace_probe.py:15,23` expose FastAPI `response_model`s backed by typed platform models. |
| 5 | The frontend consumes backend-owned generated contracts without duplicating business logic. | ✓ VERIFIED | `frontend/src/routes/workspace/index.tsx:11-23` imports generated helpers and client config from `@/api`; `rtk make gen-types` regenerated `frontend/src/api/` with no git diff drift. |
| 6 | PostgreSQL, SQLAlchemy, Alembic, and a real DB-backed read/write path exist. | ✓ VERIFIED | `backend/tests/test_workspace_probe.py:22-24` runs `alembic upgrade head`, and `backend/tests/test_workspace_probe.py:58-73` proves POST `/workspace-probe` then GET `/workspace-probe/latest` returns the inserted row. |
| 7 | The frontend route exercises real API-backed health/probe flows through TanStack Query. | ✓ VERIFIED | `frontend/src/routes/workspace/index.tsx:51-95` queries `/health`, queries `/workspace-probe/latest`, posts `/workspace-probe`, and invalidates the latest-probe query on success. |
| 8 | Backend module boundaries exist for platform, finance, accounting, reporting, workflow, audit, integrations, and AI/data. | ✓ VERIFIED | `backend/app/README.md` names each boundary, and the corresponding package directories still exist under `backend/app/`. |
| 9 | The architecture remains a modular monolith with future AI/data seams and no microservice runtime split. | ✓ VERIFIED | `backend/app/README.md` explicitly keeps Phase 1 as one deployable FastAPI app, and `rtk rg -n "requests\\.|httpx\\.|fetch\\(|axios\\.|urllib\\.request|http://|https://" backend/app` returned no internal network seams. |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `docker-compose.yml` | Repo-root stack contract | ✓ VERIFIED | Real `postgres`, `backend`, and `frontend` services with env contract, ports, healthchecks, and source mounts for dev. |
| `Makefile` | Shared root workflow | ✓ VERIFIED | `dev`, `gen-types`, `migrate-backend`, `test-backend`, `test-frontend`, `verify-stack`, and `verify-images` exist and were exercised. |
| `backend/app/main.py` | App factory + FastAPI app | ✓ VERIFIED | `create_app()` plus module-level `app` object still exist. |
| `backend/app/api/routes/health.py` | Typed health contract | ✓ VERIFIED | Thin route adapter with `response_model=HealthResponse`. |
| `backend/app/api/routes/workspace_probe.py` | Typed DB-backed probe routes | ✓ VERIFIED | Thin route adapters for POST create and GET latest with DB session dependency. |
| `backend/migrations/versions/0001_workspace_probe.py` | First reviewed migration | ✓ VERIFIED | Migration still creates the `workspace_probe_runs` table used by the ORM and repository. |
| `frontend/src/api/` | Generated committed client contract | ✓ VERIFIED | Generated files still target `/health`, `/workspace-probe`, and `/workspace-probe/latest`; rerun of `make gen-types` produced no drift. |
| `frontend/src/routes/workspace/index.tsx` | Route-owned workspace shell using generated client | ✓ VERIFIED | Imports generated client helpers, renders health/probe state, and triggers the probe mutation. |
| `backend/app/README.md` | Boundary ownership and no-microservices contract | ✓ VERIFIED | Documents package ownership and the modular-monolith rule set. |
| `frontend/Dockerfile` | Standalone frontend application image | ✓ VERIFIED | Image now contains the Vite entrypoint, config, and source required for a direct `npm run build`. |
| `backend/Dockerfile` | Standalone backend app + migration image | ✓ VERIFIED | Image now contains `alembic.ini`, migrations, tests, and app code required for direct `alembic upgrade head` and app import. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `docker-compose.yml` | backend image | `build.context` + `working_dir` | ✓ WIRED | Backend builds from `./backend`, mounts `./backend:/app/backend`, and now runs from `/app/backend`. |
| `docker-compose.yml` | frontend image | `build.context` + bind mount | ✓ WIRED | Frontend builds from `./frontend` and mounts `./frontend:/app/frontend` for dev reload. |
| `Makefile` | generated frontend client | `gen-types` target | ✓ WIRED | `gen-types` exports FastAPI OpenAPI JSON from the backend container and regenerates `frontend/src/api/`. |
| `Makefile` | standalone images | `verify-images` target | ✓ WIRED | `verify-images` builds both images and executes standalone frontend build plus backend Alembic migration checks. |
| `backend/app/api/routes/workspace_probe.py` | DB layer | `Depends(get_db_session)` + platform helper | ✓ WIRED | Route delegates through `app.platform.workspace_probe` to repository functions, not raw SQL in the route. |
| `frontend/src/routes/workspace/index.tsx` | generated API client | `@/api` imports + TanStack Query | ✓ WIRED | Health GET, latest-probe GET, and probe POST all go through generated client helpers. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `frontend/src/routes/workspace/index.tsx` | `healthQuery.data` | Generated client `getHealthHealthGet()` → `/health` → `build_health_response()` | Yes | ✓ FLOWING |
| `frontend/src/routes/workspace/index.tsx` | `latestProbeQuery.data` | Generated client `getLatestWorkspaceProbe...()` → `/workspace-probe/latest` → repository `select` on `workspace_probe_runs` | Yes | ✓ FLOWING |
| `frontend/src/routes/workspace/index.tsx` | `probeMutation` | Generated client `createWorkspaceProbe...()` → `/workspace-probe` → repository insert into `workspace_probe_runs` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Compose stack/build contract | `rtk make verify-stack` | exited `0` | ✓ PASS |
| Backend test suite | `rtk make test-backend` | `4 passed, 1 warning` | ✓ PASS |
| Backend migration command | `rtk make migrate-backend` | exited `0` | ✓ PASS |
| OpenAPI client regeneration | `rtk make gen-types` | regenerated `frontend/src/api/` with no git diff drift | ✓ PASS |
| Frontend smoke test | `rtk make test-frontend` | `1 passed` | ✓ PASS |
| Standalone image verification target | `rtk make verify-images` | exited `0` | ✓ PASS |
| Standalone frontend image artifact | `rtk docker run --rm --entrypoint sh xai-bookkeeping-frontend -lc 'test -f index.html && test -d src && npm run build'` | built `dist/index.html`, CSS, and JS assets successfully | ✓ PASS |
| Standalone backend migration artifact | `rtk docker run --rm --entrypoint sh xai-bookkeeping-backend -lc 'test -f alembic.ini && test -d migrations/versions && python -c "from app.main import app; print(app.title)" && alembic upgrade head'` | printed `XAI Books API` and ran migration `0001_workspace_probe` successfully | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| Phase probe scripts | `rtk rg --files scripts 2>/dev/null | rtk rg 'probe-.*\\.sh$'` | no probe scripts found | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `ARCH-01` | 01-01 | Monorepo with separate frontend/backend apps | ✓ SATISFIED | Root `backend/` and `frontend/` apps still exist directly under the repo root. |
| `ARCH-02` | 01-01 | Develop, test, and deploy as separate apps from monorepo | ✓ SATISFIED | Compose dev flow passes, and standalone image checks now pass without bind mounts. |
| `ARCH-03` | 01-03 | Stable backend API contracts consumed without duplicating rules | ✓ SATISFIED | FastAPI/OpenAPI contracts regenerate cleanly and are consumed from `frontend/src/api/`. |
| `ARCH-04` | 01-04 | Explicit backend module boundaries | ✓ SATISFIED | Named package seams plus backend architecture contract remain in place. |
| `ARCH-05` | 01-04 | Avoid microservices, preserve extractable boundaries | ✓ SATISFIED | One FastAPI app, documented modular monolith, and no internal network seams. |
| `BACK-01` | 01-02 | FastAPI backend | ✓ SATISFIED | `backend/app/main.py` still builds the FastAPI app. |
| `BACK-02` | 01-02 | PostgreSQL persistence | ✓ SATISFIED | DB-backed workspace probe round trip still passes in backend tests. |
| `BACK-03` | 01-02 | SQLAlchemy + Alembic | ✓ SATISFIED | Session wiring, migration env, migration command, and standalone Alembic image check all pass. |
| `BACK-04` | 01-02 | Typed request/response schemas | ✓ SATISFIED | Health and probe routes still use typed Pydantic response models. |
| `BACK-06` | 01-04 | Clear path for future AI/data-heavy features | ✓ SATISFIED | `app/ai/` boundary and backend architecture note remain explicit. |
| `FRNT-01` | 01-03 | Separate frontend web app in monorepo | ✓ SATISFIED | Vite/React app remains under `frontend/`. |
| `FRNT-03` | 01-03 | Frontend consumes typed/generated contracts | ✓ SATISFIED | Generated client helpers and types are imported from `@/api`. |
| `FRNT-04` | 01-03 | Frontend does not own authoritative finance/audit logic | ✓ SATISFIED | Browser route consumes API responses; authoritative logic remains server-side. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `frontend/src/api/client/client.gen.ts` | 214 | `TODO` in generated client error handling | ⚠ Warning | Upstream generated artifact still carries unresolved type/error-shape debt. |
| `frontend/src/test/workspace-shell.test.tsx` | 42-79 | Fully mocked `fetch` smoke test | ℹ Info | Passing frontend test does not prove live browser-to-backend behavior by itself. |
| `.planning/ROADMAP.md` | 27-28 | `Mode: mvp` with non-user-story goal text | ⚠ Warning | Prevents strict MVP-mode user-flow verification under the current GSD contract. |

### Human Verification Required

### 1. Compose Hot Reload

**Test:** Start `make dev`, edit one backend file and one frontend file, and confirm both containers reload without rebuilding.  
**Expected:** Backend and frontend changes show up through watch/reload behavior rather than a full image rebuild.  
**Why human:** `01-VALIDATION.md` explicitly marks this behavior as manual-only because it depends on observing live container feedback.

### 2. Workspace Browser Flow

**Test:** Open `http://localhost:5173/workspace`, verify the page shows API health, click **Run Workspace Probe**, and confirm the latest-probe panel refreshes.  
**Expected:** The route loads live health state and updates the latest probe details after the POST succeeds.  
**Why human:** The Vitest smoke test stubs `fetch`, so final browser interaction and rendered-state confidence still require a live manual check.

### Gaps Summary

The previous blocker on `ARCH-02` is closed. The standalone frontend image now contains the application payload needed for a direct Vite build, and the standalone backend image now contains the Alembic config and migration files needed for a direct migration run. The exact failure mode from the prior verification is no longer reproducible.

No automated code gaps remain for Phase 1. The phase is held at `human_needed` rather than `passed` because the validation contract still contains manual-only checks for hot reload and the live browser probe flow.

---

_Verified: 2026-06-04T11:09:41Z_  
_Verifier: the agent (gsd-verifier)_
