# 02-03 Summary

## Outcome

Implemented the backend tenant boundary for Phase 2.

- Added local `companies` and `company_memberships` shadow tables keyed to Clerk organization data.
- Extended Clerk webhook sync to mirror organization create/update/delete and membership create/update/delete events.
- Added a reusable company access dependency that enforces active-organization alignment and local active membership before company-scoped routes execute.
- Added the first company-scoped backend route at `/api/v1/companies/{company_id}` to anchor later settings, team, and audit routes on the shared guard.

## Files

- `backend/app/api/router.py`
- `backend/app/api/routes/auth.py`
- `backend/app/api/routes/companies.py`
- `backend/app/db/models/__init__.py`
- `backend/app/db/models/company.py`
- `backend/app/db/models/company_membership.py`
- `backend/app/platform/company_access.py`
- `backend/app/platform/webhooks.py`
- `backend/migrations/env.py`
- `backend/migrations/versions/0003_phase2_companies.py`
- `backend/tests/test_auth.py`
- `backend/tests/test_company_authorization.py`

## Verification

- `rtk docker compose run --rm backend pytest -q tests/test_company_authorization.py`
- `rtk docker compose run --rm backend alembic upgrade head`
- `rtk make test-backend`
- `rtk make test-frontend`

## Notes

- Company route identifiers now use the Clerk organization ID directly, matching the active `org_id` claim already present in the authenticated principal and the Phase 2 research decision that local company mirrors are keyed by Clerk organization ID.
- I initially parallelized two backend test runs against the same shared Postgres database, which caused fixture interference. Final `02-03` verification was rerun serially for backend tests.
