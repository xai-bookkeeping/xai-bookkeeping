# 02-02 Summary

## Outcome

Implemented the Phase 2 frontend auth shell and preserved the same-origin Clerk cookie transport contract.

- Wired `ClerkProvider` into the frontend root and moved protected route gating into React Router.
- Added a dedicated sign-in shell and first-company creation handoff route for signed-in users without an active company.
- Switched protected frontend API traffic onto the same-origin `/api` contract through Vite proxying and a generated-client runtime wrapper.
- Regenerated the committed frontend API client and kept workspace-shell queries on generated contracts.

## Files

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/api/index.ts`
- `frontend/src/api/sdk.gen.ts`
- `frontend/src/api/types.gen.ts`
- `frontend/src/app/router.tsx`
- `frontend/src/lib/api-runtime.ts`
- `frontend/src/main.tsx`
- `frontend/src/routes/auth/sign-in.tsx`
- `frontend/src/routes/auth/create-company.tsx`
- `frontend/src/routes/workspace/index.tsx`
- `frontend/src/test/auth-routes.test.tsx`
- `frontend/src/test/workspace-shell.test.tsx`
- `frontend/src/vite-env.d.ts`
- `frontend/vite.config.ts`

## Verification

- `rtk make gen-types`
- `rtk docker compose run --rm frontend npm run test -- --run src/test/auth-routes.test.tsx`
- `rtk make test-backend`
- `rtk make test-frontend`

## Notes

- Used `@clerk/react` instead of `@clerk/clerk-react` because the latter is deprecated upstream.
- The runtime wrapper lives in `frontend/src/lib/api-runtime.ts` rather than `frontend/src/api/` so `make gen-types` can safely replace the generated directory without deleting hand-written config.
