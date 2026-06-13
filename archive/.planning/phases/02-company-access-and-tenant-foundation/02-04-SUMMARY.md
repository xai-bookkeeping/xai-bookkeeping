# 02-04 Summary

## Outcome

Implemented the frontend company-switching shell for Phase 2.

- Added a Clerk-backed company switcher in the authenticated shell so users can change active companies without leaving the workspace.
- Hooked the root shell into the generated company endpoint so active-company state, loading state, and forbidden state come from the backend tenant guard instead of static placeholders.
- Added a permission-denied state for users who are signed in but do not have local access to the active company.
- Updated the create-company route so signed-in users can add another company from the switcher flow instead of being redirected away.

## Files

- `frontend/src/api/index.ts`
- `frontend/src/api/sdk.gen.ts`
- `frontend/src/api/types.gen.ts`
- `frontend/src/components/molecules/company-switcher.tsx`
- `frontend/src/components/organisms/permission-denied-state.tsx`
- `frontend/src/routes/auth/create-company.tsx`
- `frontend/src/routes/root.tsx`
- `frontend/src/routes/workspace/index.tsx`
- `frontend/src/test/company-switcher.test.tsx`
- `frontend/src/test/workspace-shell.test.tsx`

## Verification

- `rtk make gen-types`
- `rtk docker compose run --rm frontend npm run test -- --run src/test/company-switcher.test.tsx`
- `rtk docker compose run --rm frontend npm run test -- --run src/test/workspace-shell.test.tsx`
- `rtk make test-backend`
- `rtk make test-frontend`

## Notes

- Company switches clear the React Query cache before the shell reloads company-scoped data so the next workspace view is anchored to the newly active Clerk organization.
- The root shell now treats a backend `403` company lookup as a first-class forbidden company state, which gives later team, settings, and audit screens a shared company-access contract.
