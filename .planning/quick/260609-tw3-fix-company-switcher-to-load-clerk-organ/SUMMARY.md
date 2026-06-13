---
status: complete
completed_at: 2026-06-09T17:32:15Z
---

# Summary

Root cause: `CompanySwitcher` called `useOrganizationList()` without opting into `userMemberships`, and Clerk 6.7.3 leaves `userMemberships.data` unpopulated unless requested.

Changes:

- Updated `CompanySwitcher` to call `useOrganizationList({ userMemberships: true })`.
- Routed the switcher import through the local Clerk adapter.
- Updated the switcher test mock to mirror Clerk's real opt-in behavior.

Verification:

- Red: `rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/company-switcher.test.tsx` failed because `Beta Holdings LLC` was not rendered.
- Green: same command passed with 4/4 tests.
- Restarted the frontend container and confirmed `http://localhost:5173` responds.
