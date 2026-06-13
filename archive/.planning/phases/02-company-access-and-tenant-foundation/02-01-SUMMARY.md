---
phase: 02-company-access-and-tenant-foundation
plan: "01"
subsystem: auth
tags: [clerk, fastapi, sqlalchemy, asyncpg, svix, postgres, pytest]

# Dependency graph
requires:
  - phase: 01-monorepo-and-api-web-foundations / plan 02
    provides: [FastAPI app factory, SQLAlchemy session seam, Alembic migration history, persisted workspace probe contract]
provides:
  - Clerk-authenticated backend principal resolution for protected routes
  - Verified Clerk webhook ingress for user shadow-row lifecycle sync
  - Local `users` shadow table and `/api/v1/auth/me` route
  - Async SQLAlchemy request-session foundation preserved behind the existing compose and Alembic workflow
affects: [02-02, 02-03, 02-05, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: [clerk-backend-api, asyncpg, svix]
  patterns:
    - Same backend settings object carries Clerk auth, webhook, and database configuration
    - Request-time database access uses AsyncSession while Alembic and sync test helpers keep a sync engine path
    - Clerk identity is mirrored locally through verified webhook-driven shadow rows

key-files:
  created:
    - backend/app/api/routes/auth.py
    - backend/app/db/models/user.py
    - backend/app/platform/auth.py
    - backend/app/platform/webhooks.py
    - backend/migrations/versions/0002_phase2_auth_users.py
    - backend/tests/test_auth.py
    - .planning/phases/02-company-access-and-tenant-foundation/02-01-USER-SETUP.md
  modified:
    - backend/pyproject.toml
    - backend/app/core/config.py
    - backend/app/db/session.py
    - backend/app/main.py
    - backend/app/api/router.py
    - backend/app/api/routes/workspace_probe.py
    - backend/app/platform/workspace_probe.py
    - backend/app/db/repositories/workspace_probe.py
    - backend/app/db/models/__init__.py
    - backend/migrations/env.py

key-decisions:
  - "Kept the outward-facing PostgreSQL DSN compatible with the existing Compose/Alembic flow and normalized to asyncpg only for request-time async sessions."
  - "Used a local `users` shadow table keyed by Clerk user ID so later tenant, role, audit, and settings work can authorize against Postgres instead of live Clerk reads."
  - "Disposed cached async engines on app shutdown so the backend keeps one async DB contract without leaking loop-bound connections across test or app lifecycles."

patterns-established:
  - "Protected backend routes should depend on `get_authenticated_principal()` rather than parsing Clerk state inline."
  - "Verified webhook routes should accept raw request bodies, validate Svix signatures first, then hand typed event data into platform sync helpers."
  - "Legacy sync route flows that still use request-time DB access must be upgraded alongside the session seam to avoid mixed sync/async behavior."

requirements-completed: [AUTH-01, AUTH-05]

# Metrics
duration: 35m
completed: 2026-06-07
---

# Phase 02 Plan 01: Clerk-backed backend identity and async DB foundation

**Clerk request authentication, verified user webhook sync, local user shadow rows, and an async request-session foundation that keeps the existing backend runtime contract intact**

## Performance

- **Duration:** 35m
- **Started:** 2026-06-07T16:24:00Z
- **Completed:** 2026-06-07T16:59:20Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Added Clerk-backed backend principal resolution and a protected `/api/v1/auth/me` route.
- Added verified Clerk webhook handling plus local `users` shadow-row lifecycle sync for `user.created`, `user.updated`, and `user.deleted`.
- Converted request-time backend DB access onto async SQLAlchemy and upgraded the existing workspace-probe walking skeleton to the same async session contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing coverage for protected auth and webhook ingress** - `b63fa07` (`test`)
2. **Task 2: Implement Clerk auth, verified webhook sync, user shadow rows, and async DB session wiring** - `5cbad8f` (`feat`)

## Files Created/Modified

- `backend/tests/test_auth.py` - Regression coverage for unauthenticated access, webhook rejection, user-table migration, local shadow-row reads, and webhook-driven user sync.
- `backend/app/platform/auth.py` - Clerk request-auth adapter and reusable authenticated-principal dependency.
- `backend/app/platform/webhooks.py` - Svix signature verification and Clerk user-event sync helpers.
- `backend/app/api/routes/auth.py` - `/api/v1/auth/me` and `/api/v1/webhooks/clerk` transport endpoints.
- `backend/app/db/models/user.py` and `backend/migrations/versions/0002_phase2_auth_users.py` - Local user shadow model plus reviewed schema revision.
- `backend/app/db/session.py` and `backend/app/main.py` - Async request-session factory, sync/async URL normalization, and app-shutdown disposal of cached async DB resources.
- `backend/app/api/routes/workspace_probe.py`, `backend/app/platform/workspace_probe.py`, and `backend/app/db/repositories/workspace_probe.py` - Async upgrade of the existing workspace-probe flow so the backend no longer mixes sync request DB usage with the new async foundation.
- `backend/pyproject.toml`, `backend/app/core/config.py`, `backend/migrations/env.py` - Dependency and settings expansion for Clerk, Svix, and asyncpg while preserving Alembic compatibility.

## Decisions Made

- Kept the compose-era `postgresql+psycopg://...` configuration shape and converted it internally for async request handling so existing health checks, Alembic usage, and sync cleanup helpers stay valid.
- Stored only the Phase 2 identity fields the backend needs immediately in the local user shadow row, leaving broader profile or membership shape for later phase plans.
- Centralized webhook verification before any DB mutation, with local sync helpers handling idempotent create/update/delete behavior instead of route-level branching.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected masked-password URL conversion for async DB sessions**
- **Found during:** Task 2 verification
- **Issue:** The first async URL normalization path rendered the password as `***`, which caused asyncpg authentication failures even though the configured DSN was correct.
- **Fix:** Switched driver-rewrite rendering to `hide_password=False` so the async engine receives the real password while keeping the outward config contract unchanged.
- **Files modified:** `backend/app/db/session.py`
- **Verification:** `docker compose run --rm backend pytest -q tests/test_auth.py`
- **Committed in:** `5cbad8f`

**2. [Rule 1 - Bug] Upgraded the Phase 1 workspace probe flow to async to match the new request-session seam**
- **Found during:** Task 2 verification
- **Issue:** Existing probe repository/service code still called sync `commit()`/`refresh()` against `AsyncSession`, which broke the full backend suite after the session-layer migration.
- **Fix:** Converted the route, platform helper, and repository to async and awaited the SQLAlchemy session operations.
- **Files modified:** `backend/app/api/routes/workspace_probe.py`, `backend/app/platform/workspace_probe.py`, `backend/app/db/repositories/workspace_probe.py`
- **Verification:** `make test-backend`
- **Committed in:** `5cbad8f`

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs).
**Impact on plan:** Both fixes were required to make the planned async/auth foundation correct and to preserve the previously shipped backend contract.

## Issues Encountered

- Async SQLAlchemy engine reuse across multiple FastAPI test-client lifecycles surfaced loop-bound connection cleanup issues; disposing cached async resources on app shutdown resolved the leak cleanly.
- The backend container had to be rebuilt once after adding Clerk, Svix, and asyncpg so the compose test runner could import the new packages.

## User Setup Required

**External services require manual configuration.** See [02-01-USER-SETUP.md](./02-01-USER-SETUP.md) for:
- Environment variables to add
- Clerk dashboard webhook setup steps
- Verification commands

## Next Phase Readiness

- Phase 02-02 can now wire the frontend sign-in shell against a real protected backend route and same-origin cookie contract.
- Phase 02-03 can build company and membership shadow tables on top of the verified Clerk identity foundation and shared async session seam.
- I did not update `.planning/ROADMAP.md` or `.planning/STATE.md` in this run because `.planning/ROADMAP.md` already had unrelated local edits; this summary is the execution artifact for the completed plan.

## Self-Check: PASSED

- `backend/tests/test_auth.py` exists on disk.
- `backend/migrations/versions/0002_phase2_auth_users.py` exists on disk.
- Commit `b63fa07` exists in git history.
- Commit `5cbad8f` exists in git history.
- `make test-backend`, `docker compose run --rm backend alembic upgrade head`, and `make test-frontend` passed after implementation.

---
*Phase: 02-company-access-and-tenant-foundation*
*Completed: 2026-06-07*
