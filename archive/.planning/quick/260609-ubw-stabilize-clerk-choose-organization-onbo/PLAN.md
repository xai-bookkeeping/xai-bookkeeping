# Stabilize Clerk Choose Organization Onboarding

## Problem

After email OTP signup, Clerk can require a `choose-organization` session task while XAI also redirects signed-in users into `/create-company`. Without an explicit task route, Clerk may surface its own task UI through the auth flow, causing visible page blinking and duplicate company/organization prompts.

## Plan

1. Add a dedicated app route for Clerk's `choose-organization` task.
2. Render Clerk's `TaskChooseOrganization` there and redirect completion back to `/create-company`.
3. Configure `ClerkProvider.taskUrls` so Clerk routes that task through the app-owned route.
4. Let the Clerk task component own pending session state instead of redirecting `!isSignedIn` early.
5. Cover the route with auth regression tests for signed-in and pending-task states.
6. Restart the frontend for live UAT.

## Verification

- Red: focused auth route test failed because `/tasks/choose-organization` was not routed.
- Green: focused auth route test passed after adding the route.
- Red: pending-task regression failed while the task route redirected `!isSignedIn` to `/sign-in`.
- Green: pending-task regression passed after removing the app-level signed-in guard.
- Green: full `src/test/auth-routes.test.tsx` passed.
- Typecheck: blocked by existing TypeScript config/source errors outside this change.
