# XAI Books

XAI Books is the first XAI module for UAE SMEs. Phase 1 establishes the root monorepo contract, Docker Compose local stack, and the documented path the later backend and frontend plans will plug into.

## Local Setup

1. Copy the root environment template:

   ```bash
   cp .env.example .env
   ```

2. Start the full stack from the repository root:

   ```bash
   make dev
   ```

3. Open the services:

   - Backend health: `http://localhost:8000/health`
   - Workspace shell route: `http://localhost:5173/workspace`

If you change backend or frontend dependencies, rebuild the images before starting the stack again:

```bash
docker compose build backend frontend
```

## Common Commands

```bash
make dev
make down
make logs
make gen-types
make migrate-backend
make test-backend
make test-frontend
make verify-stack
make verify-images
```

Run `make gen-types` any time backend request/response schemas change. The command exports the FastAPI OpenAPI document from the backend container and regenerates the committed TypeScript client under `frontend/src/api/`.

## Verification Sequence

Use this order after changing the stack wiring:

1. Validate the Compose file:

   ```bash
   make verify-stack
   ```

   This wraps the Wave 0 Compose checks:

   ```bash
   docker compose config
   docker compose build backend frontend
   ```

2. Start the stack:

   ```bash
   make dev
   ```

3. Confirm the backend health URL returns a healthy response and the workspace shell route loads in the browser.

4. Re-run `make gen-types` after backend contract changes once the OpenAPI client pipeline is in place.

5. Re-run `make verify-images` when you need to confirm the standalone backend and frontend images still work without source bind mounts.

## Layout

- `backend/` holds the FastAPI application and backend tooling.
- `backend/app/README.md` documents the backend modular-monolith contract and boundary map.
- `frontend/` holds the React/Vite application shell and generated client code.
- `docker-compose.yml` orchestrates PostgreSQL, backend, and frontend together from the repository root.
- `Makefile` provides the shared developer commands used throughout the phase.
