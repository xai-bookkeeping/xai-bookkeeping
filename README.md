# XAI Books

XAI Books — bookkeeping module for UAE SMEs.

## Quick Start

```bash
cp web/.env.example web/.env   # first time only — fill in secrets
docker compose up --build
```

App runs at `http://localhost:5173` (or `WEB_PORT` from `.env`).

```bash
docker compose down -v   # stop and wipe database
docker compose up        # restart without rebuild
```

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
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials from Google Cloud Console |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app |
| `SMTP_*` | Email provider credentials (use Mailhog locally) |
