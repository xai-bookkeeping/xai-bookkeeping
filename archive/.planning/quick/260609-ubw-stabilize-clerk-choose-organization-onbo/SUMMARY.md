# Summary

## Changed

- Added `/tasks/choose-organization` as an app-native route for Clerk's required organization task.
- Wired `ClerkProvider.taskUrls` to send `choose-organization` tasks to that route.
- Exported `TaskChooseOrganization` and shared Clerk task URL constants from the local Clerk adapter.
- Let the task route render even when `useAuth()` reports signed-out, because Clerk pending session tasks can appear that way until the task completes.
- Added auth route regression tests for signed-in task rendering, pending-task rendering, and the post-task `/create-company` readiness handoff.

## Result

The signup handoff now has one explicit Clerk task surface before returning to XAI company readiness, avoiding the previous bounce between Clerk auth UI and the app company creation page.

## Verification

```bash
rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/auth-routes.test.tsx -t "choose-organization"
rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/auth-routes.test.tsx -t "pending|asking again"
rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/auth-routes.test.tsx
```

Both test commands passed.

`rtk docker compose run --rm --no-deps frontend npm run typecheck` is still blocked by the existing TypeScript 6 `baseUrl` deprecation. Running `npx tsc --noEmit --ignoreDeprecations 6.0` continues into pre-existing router/workspace/team type errors unrelated to this Clerk task route.
