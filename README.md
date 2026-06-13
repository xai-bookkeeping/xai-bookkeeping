# XAI Books

XAI Books — bookkeeping module for UAE SMEs.

## Running

```bash
cp web/.env.example web/.env   # first time only — fill in secrets
docker compose up --build
```

App runs at `http://localhost:5173` (or whatever `WEB_PORT` is set to in `.env`).

To stop and wipe the database:

```bash
docker compose down -v
```

To restart without rebuilding:

```bash
docker compose up
```
