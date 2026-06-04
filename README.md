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

## Common Commands

```bash
make dev
make down
make logs
make gen-types
make test-backend
make test-frontend
```

## Verification Sequence

Use this order after changing the stack wiring:

1. Validate the Compose file:

   ```bash
   docker compose config
   ```

2. Build the backend and frontend images:

   ```bash
   docker compose build backend frontend
   ```

3. Start the stack:

   ```bash
   make dev
   ```

4. Confirm the backend health URL returns a healthy response and the workspace shell route loads in the browser.

5. Re-run `make gen-types` after backend contract changes once the OpenAPI client pipeline is in place.

## Layout

- `backend/` holds the FastAPI application and backend tooling.
- `frontend/` holds the React/Vite application shell and generated client code.
- `docker-compose.yml` orchestrates PostgreSQL, backend, and frontend together from the repository root.
- `Makefile` provides the shared developer commands used throughout the phase.
