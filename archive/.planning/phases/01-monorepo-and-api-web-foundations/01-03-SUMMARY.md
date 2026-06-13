---
phase: 01-monorepo-and-api-web-foundations
plan: "03"
subsystem: ui
tags: [react, vite, typescript, tailwindcss, tanstack-query, openapi, react-router, shadcn-ui]

# Dependency graph
requires:
  - phase: 01-01
    provides: Root Compose monorepo scaffold, backend container, and the health/workspace probe API contract
  - phase: 01-02
    provides: Typed backend health and workspace probe endpoints plus the persisted probe round trip
provides:
  - Vite + React + TypeScript frontend shell under `frontend/`
  - Committed OpenAPI-generated TypeScript client artifacts under `frontend/src/api/`
  - Route-owned workspace probe screen backed by TanStack Query
  - Frontend smoke coverage and build verification for the probe flow
affects:
  - 01-04
  - future frontend feature phases
  - README and contract-regeneration workflow updates

# Tech tracking
tech-stack:
  added: [@hey-api/openapi-ts, React Router, TanStack Query, Tailwind CSS, shadcn/ui primitives]
  patterns:
    - Generated OpenAPI client artifacts are committed under `frontend/src/api/` and regenerated explicitly with `make gen-types`
    - Page composition stays in `frontend/src/routes/` while reusable UI stays in atomic component directories
    - Workspace state is fetched and invalidated through TanStack Query rather than handwritten fetch orchestration
    - The frontend base URL comes from `VITE_API_URL` with a local Compose fallback for browser and container runs

key-files:
  created:
    - frontend/src/api/
    - frontend/src/components/atoms/index.ts
    - frontend/src/components/molecules/index.ts
    - frontend/src/components/organisms/index.ts
    - frontend/src/components/templates/index.ts
    - frontend/src/components/ui/badge.tsx
    - frontend/src/components/ui/button.tsx
    - frontend/src/components/ui/card.tsx
    - frontend/src/components/ui/input.tsx
    - frontend/src/lib/cn.ts
    - frontend/src/routes/workspace/index.tsx
    - frontend/src/test/workspace-shell.test.tsx
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/Dockerfile
    - docker-compose.yml
    - frontend/tsconfig.json
    - frontend/vite.config.ts
    - frontend/vitest.config.ts
    - frontend/tailwind.config.ts
    - frontend/src/main.tsx
    - frontend/src/app/router.tsx
    - frontend/src/routes/root.tsx
    - frontend/src/styles.css
    - frontend/src/vite-env.d.ts
    - Makefile
    - README.md

key-decisions:
  - "Selected `@hey-api/openapi-ts` because it emits both client helpers and schema types for the Vite/React app without inventing a custom contract layer."
  - "Kept the generated contract committed under `frontend/src/api/` so the browser consumes backend-owned schemas without duplicating finance logic."
  - "Used TanStack Query for health/probe fetches and mutation invalidation so the route stays declarative and cache-aware."
  - "Kept the API base URL configurable via `VITE_API_URL` with a localhost fallback for Docker and local browser runs."

patterns-established:
  - "Backend OpenAPI schema is the frontend contract source of truth."
  - "Reusable UI stays in `frontend/src/components/{atoms,molecules,organisms,templates}`; route composition stays in `frontend/src/routes/`."
  - "Workspace probe screens should use query invalidation after mutations instead of manual refresh logic."
  - "Root developer commands should remain in `Makefile`, including contract regeneration."

requirements-completed: [ARCH-03, FRNT-01, FRNT-03, FRNT-04]

# Metrics
duration: 30m
completed: 2026-06-04
---

# Phase 01 Plan 03: Frontend shell, generated contract, and workspace probe summary

**React/Vite workspace shell with committed OpenAPI-generated client artifacts and a probe-driven route backed by TanStack Query**

## Performance

- **Duration:** 30m
- **Started:** 2026-06-04T14:00:00+04:00
- **Completed:** 2026-06-04T14:30:00+04:00
- **Tasks:** 3
- **Files modified:** 50

## Accomplishments

- Bootstrapped a separate TypeScript Vite frontend with the locked route/component structure, Tailwind wiring, and shadcn/ui primitives.
- Wired `make gen-types` to export the backend OpenAPI schema and regenerate committed client helpers/types under `frontend/src/api/`.
- Implemented the workspace probe route and smoke test so the browser shell can read health/probe state and trigger the real backend mutation through TanStack Query.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold the React/Vite app shell with the locked route and component structure** - `4006a0c` (`feat`)
2. **Task 2: Generate and commit the backend API client contract** - `3e99efe` (`feat`)
3. **Task 3: Build the workspace shell route around the real probe flow** - `76a70d9` (`feat`)

## Files Created/Modified

- `frontend/src/routes/workspace/index.tsx` - Workspace probe route that reads health/latest probe data and posts new probes through generated client helpers.
- `frontend/src/test/workspace-shell.test.tsx` - Smoke test that renders the router/query shell and verifies the primary CTA plus probe refresh behavior.
- `frontend/src/api/` - Generated OpenAPI client helpers and schema types committed to the repo.
- `Makefile` - Root `gen-types` workflow that exports backend OpenAPI JSON and regenerates frontend contract artifacts.
- `frontend/package.json` - Contract-generation script plus frontend runtime/test/build dependencies.
- `frontend/src/app/router.tsx` - Nested route wiring and router future flag alignment.
- `frontend/src/routes/root.tsx` - App shell frame with the route outlet and workspace framing.
- `frontend/src/components/ui/*` - Minimal shadcn/ui primitives used by the shell and workspace route.
- `frontend/src/components/{atoms,molecules,organisms,templates}/index.ts` - Locked atomic directory split for reusable UI.
- `frontend/src/styles.css`, `frontend/tailwind.config.ts`, `frontend/src/main.tsx` - Theme tokens, Tailwind setup, and application bootstrap.
- `README.md` - Regeneration guidance for contributors after backend schema changes.
- `docker-compose.yml`, `frontend/Dockerfile`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`, `frontend/src/vite-env.d.ts` - Runtime, build, test, and typed env support for the new frontend app.

## Decisions Made

- Selected `@hey-api/openapi-ts` as the OpenAPI-to-TypeScript generator so the frontend gets both helpers and schema types from one maintained tool.
- Kept generated client output committed under `frontend/src/api/` instead of a shared runtime package so the browser depends directly on the backend schema.
- Used TanStack Query for health/probe reads and probe mutation invalidation so the workspace shell stays declarative and cache-aware.
- Kept the API base URL configurable with `VITE_API_URL` and a localhost fallback so the same code works in Compose and browser-based verification.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The frontend build initially failed with `sh: 1: vite: not found` until the frontend image was rebuilt after the Dockerfile install step changed; `docker compose build frontend` resolved it.
- React Router emitted a future-flag warning during the smoke test run, but the test itself passed and the router was already using the recommended `v7_startTransition` future flag.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The frontend contract regeneration workflow is now explicit and repeatable through `make gen-types`.
- The workspace route can exercise the backend probe flow end-to-end, so the next frontend plan can build on a real app shell instead of placeholders.

## Self-Check: PASSED

- `/Users/mali/Development/xai-bookkeeping/.planning/phases/01-monorepo-and-api-web-foundations/01-03-SUMMARY.md` exists on disk.
- Task commit hashes `4006a0c`, `3e99efe`, and `76a70d9` are present in git history.

---
*Phase: 01-monorepo-and-api-web-foundations*
*Completed: 2026-06-04*
