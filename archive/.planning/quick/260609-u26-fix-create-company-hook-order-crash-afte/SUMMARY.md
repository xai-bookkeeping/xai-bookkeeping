---
status: complete
completed_at: 2026-06-09T17:41:10Z
---

# Summary

Root cause: `CreateCompanyRoute` returned `<Navigate replace to="/sign-in" />` before calling its later `useQuery` and `useEffect` hooks. During email OTP/signup handoff, Clerk can change auth state across renders, which caused React to see fewer hooks and throw `Rendered fewer hooks than expected`.

Changes:

- Moved the signed-out redirect below all hooks in `CreateCompanyRoute`.
- Added a regression test that re-renders `CreateCompanyRoute` while the mocked Clerk auth state changes and asserts the hook-order error is not thrown.

Verification:

- Red: `rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/auth-routes.test.tsx -t "create-company keeps hook order stable"` failed with `Rendered fewer hooks than expected`.
- Green: the same focused command passed.
- Full auth route suite: `rtk docker compose run --rm --no-deps frontend npm run test -- --run src/test/auth-routes.test.tsx` passed with 13/13 tests.
- Restarted frontend and confirmed `http://localhost:5173` responds.
