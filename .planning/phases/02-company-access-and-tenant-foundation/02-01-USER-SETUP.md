# Phase 02 Plan 01 User Setup

This plan adds Clerk-backed backend authentication and webhook verification. Local and hosted environments need the following variables before real integration checks can pass.

## Required Environment Variables

- `CLERK_PUBLISHABLE_KEY` - Clerk frontend publishable key for the target environment.
- `CLERK_SECRET_KEY` - Clerk backend secret key used to authenticate incoming session tokens.
- `CLERK_JWT_KEY` - Optional PEM public key for networkless session-token verification. Recommended for local development and tests that should avoid extra network hops.
- `CLERK_WEBHOOK_SIGNING_SECRET` - Svix/Clerk webhook signing secret for the configured endpoint.
- `CLERK_AUTHORIZED_PARTIES` - Comma-separated allowed frontend origins, for example `http://localhost:5173`.

## Clerk Dashboard Setup

1. Create or open the Clerk application used for XAI Books.
2. Copy the publishable key and secret key into the backend/frontend environment.
3. In the Clerk dashboard, open the webhook endpoint configuration and copy the signing secret.
4. Subscribe the endpoint to at least `user.created`, `user.updated`, and `user.deleted`.
5. Point the endpoint at the backend webhook route: `/api/v1/webhooks/clerk`.

## Verification Commands

- `docker compose run --rm backend pytest -q tests/test_auth.py`
- `docker compose run --rm backend alembic upgrade head`
- `make test-backend`
