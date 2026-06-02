# Phase 1: Monorepo and API/Web Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 1-Monorepo and API/Web Foundations
**Areas discussed:** Monorepo structure, API contract mechanism, Frontend UI foundation, Local dev setup

---

## Monorepo Structure

### Q1: Where do the backend and frontend apps live?

| Option | Description | Selected |
|--------|-------------|----------|
| `backend/` + `frontend/` flat at root | Simple, readable, zero tooling overhead | ✓ |
| `apps/backend` + `apps/frontend` | Common in Turborepo/nx setups, adds an `apps/` layer | |
| Something else | Different structure in mind | |

**User's choice:** `backend/` + `frontend/` flat at root

---

### Q2: Is there a shared directory?

| Option | Description | Selected |
|--------|-------------|----------|
| No shared directory — contracts live in backend, frontend imports generated types | Clean separation; backend is source of truth | ✓ |
| `shared/` or `packages/` directory at root | Shared TypeScript types or utilities | |
| You decide | Let the planner/researcher pick | |

**User's choice:** No shared directory

---

### Q3: Root workspace manager or Docker Compose?

| Option | Description | Selected |
|--------|-------------|----------|
| Root Makefile / shell scripts only | Simple commands; no JS workspace overhead | |
| pnpm workspaces at root | JavaScript-native workspace management | |
| Turborepo or nx | Adds caching and pipeline orchestration | |

**User's choice:** Docker Compose (free-text response — user specified Docker Compose as the root coordination mechanism, which also answers the local dev setup area)

---

### Q4: Where does shared tooling config live?

| Option | Description | Selected |
|--------|-------------|----------|
| Root-level configs per tool (`.github/`, `.eslintrc`, `pyproject.toml`) | Standard practice for mixed-language monorepos | ✓ |
| Each app self-contained — no root config files | Backend and frontend each manage their own tooling | |
| You decide | Let researcher figure out the right split | |

**User's choice:** Root-level configs per tool

---

## API Contract Mechanism

### Q1: How should the frontend consume typed backend contracts?

| Option | Description | Selected |
|--------|-------------|----------|
| OpenAPI spec + codegen | FastAPI auto-generates spec; codegen produces typed TS client | ✓ |
| Manual TypeScript types (hand-synced) | Developer copies/writes TS types mirroring Pydantic models | |
| You decide | Let researcher pick best codegen approach | |

**User's choice:** OpenAPI spec + codegen

---

### Q2: When is codegen run?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual: `make gen-types` when backend changes | Developer triggers; simple, explicit | ✓ |
| Automatic: CI regenerates on backend changes | Safer for teams, adds CI complexity | |
| On dev server start: backend serves spec, frontend generates at startup | Types always fresh during local dev | |

**User's choice:** Manual: `make gen-types`

---

### Q3: Where do generated types live?

| Option | Description | Selected |
|--------|-------------|----------|
| `frontend/src/api/` — generated client and types | Conventional, clearly separated | ✓ |
| `frontend/src/types/api/` — types only, client written by hand | Types generated, HTTP client manual | |
| You decide | Let researcher determine cleanest structure | |

**User's choice:** `frontend/src/api/`

---

### Q4: Commit generated files?

| Option | Description | Selected |
|--------|-------------|----------|
| Committed to git | Visible in diffs; accessible to agents | ✓ |
| Gitignored — regenerated on setup | Keeps repo clean; requires setup step | |
| You decide | Standard practice is fine | |

**User's choice:** Committed to git

---

## Frontend UI Foundation

### Q1: Component library and styling system?

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui + Tailwind CSS | Owned components, highly customizable, Radix primitives | ✓ |
| Ant Design (antd) | Enterprise-grade, opinionated design language | |
| Material UI (MUI) | Google Material, well-maintained, needs overriding | |
| Bare Tailwind + custom components | Maximum control, maximum build time | |

**User's choice:** shadcn/ui + Tailwind CSS

---

### Q2: Routing library?

| Option | Description | Selected |
|--------|-------------|----------|
| React Router v6 | Standard for React SPAs, nested routes work well | ✓ |
| TanStack Router | Type-safe routing with full TS inference | |
| You decide | Let researcher pick | |

**User's choice:** React Router v6

---

### Q3: Server state management?

| Option | Description | Selected |
|--------|-------------|----------|
| TanStack Query (React Query) | Industry standard; caching, background refresh, loading/error states | ✓ |
| SWR | Simpler, lighter alternative | |
| Redux Toolkit with RTK Query | Full Redux + built-in query | |
| Plain fetch/axios with React state | No caching library | |

**User's choice:** TanStack Query (React Query)

---

## Local Dev Setup

### Q1: What runs in Docker Compose vs. natively?

| Option | Description | Selected |
|--------|-------------|----------|
| DB in Docker, backend + frontend run natively | Fastest inner loop; most common DX pattern | |
| Everything in Docker Compose | Full isolation; consistent across machines | ✓ |
| DB + backend in Docker, frontend native | Middle ground | |

**User's choice:** Everything in Docker Compose

---

### Q2: Hot reload in Docker?

| Option | Description | Selected |
|--------|-------------|----------|
| Volume mounts + uvicorn --reload + Vite HMR | No rebuild for code changes; fast inner loop | ✓ |
| Rebuild containers on change | Most production-faithful; slowest inner loop | |
| You decide | Standard Docker dev workflow is fine | |

**User's choice:** Volume mounts + uvicorn --reload + Vite HMR

---

### Q3: Environment configuration?

| Option | Description | Selected |
|--------|-------------|----------|
| `.env` file at root, loaded by Docker Compose | Single source of truth; `.env.example` committed | ✓ |
| Separate `.env` per app | More explicit per-app; duplicates shared vars | |
| Hardcoded dev defaults, no `.env` | Simplest; bad production habits | |

**User's choice:** `.env` at root, loaded by Docker Compose

---

## Claude's Discretion

- Specific codegen tool selection (openapi-ts vs. orval vs. another)
- Python version and virtual environment tooling inside the backend container
- Node version and package manager (npm vs. pnpm) for the frontend
- Port assignments for local services
- Backend module boundary internal structure (folder layout within `backend/`)

## Deferred Ideas

None — discussion stayed within phase scope.
