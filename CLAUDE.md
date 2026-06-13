# Claude Code Instructions — XAI Bookkeeping

## Branch Rules

Always branch from `dev`. Never from `main` or `qa`.

```bash
git checkout dev && git pull origin dev
git checkout -b feature/your-task-name
```

Flow: `feature/*` → PR → `dev` → PR → `qa` → PR → `main`

## Commit Style

Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`

## Stack

- Next.js app in `web/`
- PostgreSQL via Prisma
- Auth.js (Google OAuth)
- Docker Compose for local dev

## Never

- Commit directly to `main` or `qa`
- Push secrets or `.env` files
- Skip migrations — run `npx prisma migrate dev` after schema changes
