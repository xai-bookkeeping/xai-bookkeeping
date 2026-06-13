---
status: complete
created_at: 2026-06-09T17:38:37.095Z
---

# Fix Create-Company Hook-Order Crash

Task: Fix create-company hook-order crash after email OTP signup.

## Plan

1. Trace the reported React hook-count error to the auth/onboarding route shown after OTP.
2. Add a focused regression that re-renders `CreateCompanyRoute` while Clerk auth state changes.
3. Move any conditional redirect return below all hooks in `CreateCompanyRoute`.
4. Run focused and full auth-route tests.
5. Restart the frontend dev server for live UAT.
