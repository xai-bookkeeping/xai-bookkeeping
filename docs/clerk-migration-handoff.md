# Handoff — NextAuth → Clerk migration (identity-only swap)

**Project:** XAI Books (`/Users/mali/Development/xai-bookkeeping`)
**Date:** 2026-06-15
**Origin:** `/grill-me` session. All decisions below are user-confirmed.
**Next session goal:** Execute the migration via **subagent-driven development** — independent work-packages (WPs) below are designed to be picked up cold.

---

## 1. Context in one paragraph

The app in `web/` is a Next.js (App Router) + Prisma + Postgres monolith with a **heavily custom NextAuth** setup (`web/auth.ts`, 426 lines): Credentials + Google providers, JWT strategy, DB-backed session tracking, custom RBAC, rate-limiting, audit logging, onboarding. We are replacing **only the authentication mechanism** with Clerk. The Postgres `User`/`Company`/RBAC/audit domain **stays the source of truth**. This is an infra swap, not an app refactor. Note: the archived planning docs (`archive/.planning/`) describe a *different* stack (FastAPI + React + Clerk Organizations) that was never built and a multi-company model that does not exist — **treat those docs as stale on stack/orgs**; they are NOT the target. Reality = single-company Next.js, confirmed by `Company.ownerId @unique` in `web/prisma/schema.prisma`.

## 2. Locked decisions (do not re-litigate)

| # | Decision |
|---|---|
| Scope | **Identity-only.** Clerk = login/session/credentials only. Single-company stays. |
| Roles | Stay in Postgres. Resolved per-request by `clerkUserId` via cached Prisma lookup. NOT in Clerk metadata. |
| Existing users | **Greenfield** — wipe dev users, everyone re-signs-up through Clerk. No password import. |
| Provisioning | **Clerk webhook** (`user.created/updated/deleted`) → idempotent upsert into `User`. Plus **JIT self-heal** in `getCurrentUser()` for the ~1s webhook race. |
| Company/onboarding | Webhook sets `onboardingCompleted=false`. Existing onboarding wizard creates the `Company` row + flips the flag. |
| Sessions | **Delegate fully to Clerk.** Drop `userSession` table + `sessionVersion` + expiry logic. Admin "suspend" → Clerk `lockUser`/ban. Devices → Clerk `<UserProfile>`. |
| Login audit | **Keep.** Clerk webhook `session.created`/`session.ended` → write `LOGIN_SUCCEEDED`/`LOGOUT` to `ActivityLog` (AUDT-01). |
| Auth UI | **Headless** — keep existing custom `(auth)` forms, drive Clerk via hooks (`useSignIn`, `useSignUp`, `setActive`, `useClerk`). NO drop-in `<SignIn/>`/`<SignUp/>` components. |
| Verify/reset | **Code-based (OTP)** via Clerk. Clerk sends those emails (templated in dashboard). Drop token tables + auth-email senders. |
| Google | Clerk **social connection**. Headless `authenticateWithRedirect` + new `/sso-callback` page. Drop `resolveGoogleUser`, `googleId`, `authProvider`. Google signups use the same webhook→User→onboarding path. |
| Invitations | **Clerk invitations API.** Role intent in `publicMetadata` → webhook lands role in Postgres. Drop `UserInvitation` + `acceptInvitationAction`. |
| Rate limit | **Drop** `lib/rate-limit` + `LoginAttempt` table. Clerk abuse protection. |
| Middleware | `clerkMiddleware` = coarse auth gate only. Onboarding gate stays in `(dashboard)` server layout via `getCurrentUser()` (Prisma, not edge). |
| Adapter | **Compatibility adapter** `getCurrentUser()` returns the OLD session shape `{ user: { id, email, name, role, assignedRoles, companyName, ... } }` so `requireUser`/`requireAdmin` keep their contracts and ~69 callers barely change. |
| Tests | Mock `getCurrentUser` as the single test seam. Delete `account-sessions.test.ts`. Add webhook-handler test (svix verify + idempotent upsert). |
| Config | `@clerk/nextjs` + `<ClerkProvider>` in root layout. Dev: rely on JIT self-heal (Clerk can't reach localhost Docker); real webhook fires in QA/prod. |

## 3. Open items to decide in-flight (low risk)

1. **First user = ADMIN?** Schema default `Role` is `ACCOUNTANT`, but the single-company owner who signs up should likely get `ADMIN`. Webhook needs this rule (e.g. first user / company owner → ADMIN).
2. **Field sync on `user.updated`:** Clerk authoritative for `email`, `firstName`, `lastName`, `avatarUrl`. `displayName`/`username` stay locally editable.
3. **Destructive migration:** add `clerkUserId` (unique), drop auth columns — run as one Prisma migration on the wiped dev DB.

## 4. Reference artifacts (do not duplicate — read these)

- `web/auth.ts` — the NextAuth config being torn out.
- `web/lib/api-utils.ts` — `requireUser`/`requireAdmin` (contract to preserve).
- `web/actions/auth.ts` — server actions: `loginAction`, `googleSignInAction`, `acceptInvitationAction`, `signOutAction`.
- `web/prisma/schema.prisma` — `User` (line 10), `Company` (73, `ownerId @unique` = single-tenant), `UserSession`, `LoginAttempt`, `VerificationToken`, `PasswordResetToken`, `UserInvitation`, `UserRoleAssignment`, `AdminRole`, `Permission`, `ActivityLog`.
- `web/types/next-auth.d.ts` — module augmentation to delete (replace with plain `CurrentUser` type).
- `web/components/auth/` — custom forms (`LoginForm`, `RegisterForm`, `OnboardingWizard`, `AuthLeft`) to keep + rewire.
- `web/app/(auth)/` & `web/app/(dashboard)/layout.tsx` — route groups + gates.
- `web/app/api/onboarding/route.ts` — onboarding finish (creates Company).
- `web/proxy.ts` — verify it carries no NextAuth assumptions.
- `archive/.planning/REQUIREMENTS.md`, `archive/.planning/phases/02-company-access-and-tenant-foundation/02-CONTEXT.md` — **stale on stack/orgs**; use only for requirement IDs (AUTH-*, AUDT-01).
- CodeGraph is indexed (`.codegraph/`) — use `codegraph_explore` to locate the ~69 `auth()`/`session.user` consumers instead of grep.

## 5. Work-packages for subagent-driven development

Dependency-ordered into waves. WP-0/WP-1 are the shared foundation; later waves parallelize.

### Wave 0 — Foundation (sequential, blocks everything)
- **WP-0 Setup & config.** Install `@clerk/nextjs`. `<ClerkProvider>` in `app/layout.tsx`. Env in: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`. Env out: `GOOGLE_CLIENT_ID/SECRET`, `NEXTAUTH_SECRET`/`AUTH_SECRET`, `NEXTAUTH_URL`. Update `.env.example`, `.env.dev.example`, Docker compose passthrough. Configure Clerk dashboard: Google social connection, code-based verify/reset, brand email templates. (Skills: `clerk-setup`, `clerk-cli`.)
- **WP-1 Schema migration.** Prisma: add `User.clerkUserId String @unique`. Drop columns `passwordHash`, `sessionVersion`, `googleId`, `authProvider`, `passwordLoginEnabled`, `emailVerified`, `emailVerifiedAt`. Drop models `UserSession`, `LoginAttempt`, `VerificationToken`, `PasswordResetToken`, `UserInvitation`. One migration on wiped dev DB. **Blocks WP-2..WP-7.**

### Wave 1 — Core seam (after WP-1)
- **WP-2 `getCurrentUser()` adapter + RBAC.** New `web/lib/get-current-user.ts`: Clerk `auth()` → `clerkUserId` → React `cache()`-wrapped Prisma load (+ role assignments) → returns OLD session shape. JIT self-heal: upsert if row missing. Rewrite `requireUser`/`requireAdmin` (`lib/api-utils.ts`) to call it; **keep their return contracts identical**. Replace `types/next-auth.d.ts` with a `CurrentUser` type. **Blocks WP-3, WP-6.**
- **WP-3 Webhook handler.** `web/app/api/webhooks/clerk/route.ts`: svix signature verify, idempotent `User` upsert on `user.created` (apply `publicMetadata.role`, first-user→ADMIN rule, `onboardingCompleted=false`), sync on `user.updated`, soft-handle `user.deleted`, and `session.created/ended` → `ActivityLog`. Exclude from `clerkMiddleware`. Add the webhook test. (Skill: `clerk-webhooks`.)

### Wave 2 — Auth surface (parallel after WP-2/WP-3)
- **WP-4 Middleware + gates.** Add `web/middleware.ts` (`clerkMiddleware`, public routes `(auth)/*`, `/sso-callback`, `/api/webhooks/clerk`). Onboarding gate in `(dashboard)/layout.tsx` via `getCurrentUser()`. (Skill: `clerk-nextjs-patterns`.)
- **WP-5 Headless auth UI.** Rewire `LoginForm` → `useSignIn`+`setActive`; `RegisterForm` → `useSignUp`+OTP verify; forgot/reset pages → `reset_password_email_code`+`attemptFirstFactor`; verify-email page → code entry. Add `/sso-callback` (Google `handleRedirectCallback`). Keep `AuthLeft` chrome. (Skills: `clerk-custom-ui`, `clerk-react-patterns`.)
- **WP-6 Server actions + sign-out + invitations.** Gut `web/actions/auth.ts`: delete `loginAction`, `googleSignInAction`, `acceptInvitationAction` (moved to headless/Clerk); `signOutAction` → Clerk `signOut` + LOGOUT audit. Admin invite → Clerk `invitations.create({ publicMetadata: { role } })`. `<UserButton/>` or custom sign-out in `AppShell`. (Skills: `clerk-backend-api`, `clerk-nextjs-patterns`.)

### Wave 3 — Cleanup & verify
- **WP-7 Dead-code sweep.** Delete `web/auth.ts`, `lib/rate-limit`, auth bits of `lib/tokens`, auth-email senders, `/api/account/sessions`. Fix any remaining `session.sessionExpired` branches. CodeGraph-sweep the ~69 consumers for breakage.
- **WP-8 Test seam + full run.** Switch route tests to mock `getCurrentUser`. Delete `account-sessions.test.ts`. `npx vitest`, `npx tsc --noEmit`, build. (Skills: `tdd`, `verify`.)

## 6. Branch / process

- Per `web/CLAUDE.md`: `git checkout dev && git pull origin dev && git checkout -b feature/clerk-auth-migration`. Never branch from main/qa. Conventional commits. Run `npx prisma migrate dev` after schema change.
- Worktree isolation recommended for parallel subagents (see suggested skills).

## 7. Suggested skills for the next agent

- **`superpowers:subagent-driven-development`** — execute the WPs above with subagents in-session.
- **`superpowers:dispatching-parallel-agents`** — Wave 2 WPs (4/5/6) are independent; fan out.
- **`superpowers:using-git-worktrees`** — isolate parallel subagent work.
- **`clerk-setup`**, **`clerk-cli`** — WP-0 dashboard/env.
- **`clerk-webhooks`** — WP-3.
- **`clerk-nextjs-patterns`** — WP-4/WP-6 (middleware, server actions, caching).
- **`clerk-custom-ui`** / **`clerk-react-patterns`** — WP-5 headless hooks.
- **`clerk-backend-api`** — invitations, lockUser, sessions.
- **`tdd`** / **`verify`** — WP-8.
- **`writing-plans`** — if the next agent wants a formal PLAN.md before executing.

## 8. Gotchas

- Clerk can't deliver webhooks to localhost Docker → **dev relies on JIT self-heal** in `getCurrentUser()`; the webhook only fires in deployed envs. Don't block dev on webhook delivery.
- `getCurrentUser()` MUST derive identity from the server-verified Clerk session, never from a client-supplied body.
- Headless Clerk verify/reset are OTP state machines, not link clicks — the custom pages render code inputs.
- The `~1s` webhook lag is real; JIT self-heal is not optional.
- No secrets in this doc — all Clerk keys live in env only.
