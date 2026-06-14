# Claude Code Instructions — XAI Bookkeeping

## Branch Rules

**Before any task, always run `git status` first. If not on `dev`, check out immediately. Always `git pull origin dev` before branching.**

```bash
git status
git checkout dev   # mandatory if not already on dev
git pull origin dev   # mandatory before any new branch
git checkout -b feature/your-task-name
```

**Never branch from `main` or `qa`. No exceptions.**

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
