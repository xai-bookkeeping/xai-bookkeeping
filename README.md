# XAI Books

XAI Books — bookkeeping module for UAE SMEs.

## Environments

Three compose files, one per environment. There is no default `docker-compose.yml` — always pass `-f`.

| File | Services | Use |
|------|----------|-----|
| `docker-compose.dev.yml` | postgres only | DB for local `npm run dev` (run on a remote/tailnet box) |
| `docker-compose.qa.yml` | postgres + mailpit + web | full stack in Docker |
| `docker-compose.prod.yml` | web only | self-host fallback against external Neon DB |

### Dev — local app, remote Postgres over Tailscale

Day-to-day work: the app runs on your laptop, Postgres runs on a remote server reachable over your tailnet.

On the remote server (Postgres only):
```bash
docker compose -f docker-compose.dev.yml up -d
```

On your laptop:
```bash
cp web/.env.dev.example web/.env          # set WEB_DATABASE_URL to the tailnet host
cd web && npm install
npm run db:migrate                        # apply schema to the remote DB
npm run dev                               # http://localhost:3000
```

### QA — full stack in Docker

```bash
cp web/.env.example web/.env              # first time only — fill in secrets
docker compose -f docker-compose.qa.yml up --build
```

App at `http://localhost:3000` (or `WEB_PORT`); Mailpit UI at `http://localhost:8025`.

```bash
docker compose -f docker-compose.qa.yml down -v   # stop and wipe database
docker compose -f docker-compose.qa.yml up        # restart without rebuild
```

### Prod — Vercel / Render / Railway + Neon

Primary target: deploy `web/` to Vercel/Render/Railway, database on Neon. Copy `.env.production.example`
values into the platform's env dashboard, then apply migrations against Neon:

```bash
WEB_DATABASE_URL="<neon-direct-url>" npm run db:migrate:deploy
```

Self-host fallback (web container against external Neon):
```bash
cp .env.production.example web/.env       # set WEB_DATABASE_URL to the Neon connection string
docker compose -f docker-compose.prod.yml up --build
```
The prod container sets `DB_MIGRATE_STRATEGY=deploy`, so it runs `prisma migrate deploy` on startup —
never the destructive `db push` used by dev/qa.

---

## Branch Strategy

```
main  ←  qa  ←  dev  ←  feature/your-work
```

| Branch | Purpose | Who merges |
|--------|---------|------------|
| `dev` | active development, direct commits OK | any developer |
| `qa` | staging / testing — PR from dev | team lead |
| `main` | production — PR from qa, 1 approval required | team lead |

**Never commit directly to `qa` or `main`.**

---

## Daily Workflow

1. Pull latest dev before starting work:
   ```bash
   git checkout dev && git pull origin dev
   ```

2. Branch off dev for your feature or fix:
   ```bash
   git checkout -b feature/my-thing
   ```

3. Push and open a PR → `dev` when done.

4. Once dev is stable and tested → PR to `qa` → PR to `main`.

---

## Environment Variables

Copy `web/.env.example` to `web/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `WEB_DATABASE_URL` | PostgreSQL connection string **read by Prisma** (`schema.prisma`) |
| `DATABASE_URL` | Same connection string, kept for conventional tooling/scripts |
| `AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials from Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app |
| `SMTP_*` | Email provider credentials (use Mailhog locally) |
