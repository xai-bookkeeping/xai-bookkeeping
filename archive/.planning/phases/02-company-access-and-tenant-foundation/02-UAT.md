---
status: testing
phase: 02-company-access-and-tenant-foundation
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
  - 02-04-SUMMARY.md
  - 02-05-SUMMARY.md
  - 02-06-SUMMARY.md
  - 02-07-SUMMARY.md
started: 2026-06-08T17:28:23.930Z
updated: 2026-06-08T18:24:03Z
---

## Current Test

number: 1
name: Sign In And Reach Your Workspace
expected: |
  Open the app and sign in with a valid user.
  After authentication, you should land in the authenticated workspace shell instead of staying on the sign-in screen.
  The workspace should load for a company you are allowed to access.
awaiting: gap planning

## Tests

### 1. Sign In And Reach Your Workspace
expected: Open the app, sign in successfully, and land in the authenticated workspace shell for a company you are allowed to access.
result: issue
reported: "The auth flow looped multiple times, then showed 'The External Account was not found'. User expectation is that missing-account sign-in attempts should continue into account creation automatically, and the overall sign-in/create-account/company-setup UX is confusing and feels far from the intended xai-design.html experience."
severity: blocker

### 2. Switch To Another Authorized Company
expected: Use the company switcher in the authenticated shell and move to another company you belong to without leaving the workspace. The shell should reload around the newly active company.
result: [pending]

### 3. Open Team And Roles And Invite A Member
expected: From the workspace, open Team & roles, launch the invite dialog, and send an invite. The screen should stay within the active company context and show team-management controls for an authorized admin or owner.
result: [pending]

### 4. Change A Member Role Or Revoke Access
expected: From Team & roles, change a member role or revoke an invite/member. The action should complete within the active company and the updated role or membership state should be visible afterward.
result: [pending]

### 5. Update UAE Company Settings
expected: Open Company settings, view UAE-oriented fields such as legal name, TRN, VAT registration status, currency, and default VAT rate, then save a settings change successfully.
result: [pending]

### 6. Review Activity And Audit History
expected: Open Activity & audit and see either recorded audit events for the active company or a clear empty state. The page should remain inside the authenticated shell.
result: [pending]

### 7. Unauthorized Company Access Is Blocked
expected: Try to open a company you should not access. The app or backend should block the attempt and you should not see another company's protected data.
result: [pending]

### 8. Restricted Actions Show Permission Denial
expected: As a lower-permission user, attempting a restricted settings, team-management, or audit action should show a denied state or feedback instead of silently succeeding.
result: [pending]

### 9. Cold Start Smoke Test
expected: Start the application from a fresh state and verify it boots cleanly, migrations or seed setup complete, and a primary screen or health path responds successfully before any warm caches exist.
result: [pending]

## Summary

total: 9
passed: 0
issues: 1
pending: 8
skipped: 0
blocked: 0

## Gaps

- truth: "Open the app, sign in successfully, and land in the authenticated workspace shell for a company you are allowed to access."
  status: failed
  reason: "User reported: Uncaught SyntaxError: The requested module '/node_modules/.vite/deps/@clerk_react.js?v=6e619c10' does not provide an export named 'SignedIn' (at router.tsx:1:46). Blank page."
  severity: blocker
  test: 1
  artifacts: []
  missing: []
- truth: "A first-time user who clicks sign in with Google should be guided into a seamless account-creation and company-setup flow instead of bouncing between sign-in/sign-up states or surfacing raw Clerk errors."
  status: failed
  reason: "User reported that the flow looped multiple times, then showed 'The External Account was not found'. User expectation is Firebase/Supabase-style sign-in-or-create behavior where a missing account continues into profile creation automatically."
  severity: blocker
  test: 1
  artifacts:
    - path: "frontend/src/routes/auth/sign-in.tsx"
      issue: "Current flow is explicitly sign-in only and depends on users understanding a separate sign-up route after an OAuth attempt fails."
    - path: "frontend/src/routes/auth/sign-up.tsx"
      issue: "Sign-up exists as a separate path but the UX contract does not yet feel like one continuous auth/onboarding journey."
    - path: "frontend/src/main.tsx"
      issue: "ClerkProvider redirect wiring is local now, but product behavior still does not match the expected sign-in-or-create experience."
  missing:
    - "Plan and implement a single coherent OAuth-first new-user path that either signs in existing users or continues missing external accounts into account creation without asking the user to reason about Clerk auth states."
    - "Replace raw provider-level auth failures with product-owned guidance and transitions."
- truth: "After choosing create account, the onboarding sequence should use plain product language and a coherent order, without forcing the user through confusing identity/profile/company steps that feel like repeated sign-in."
  status: failed
  reason: "User reported the flow asks to sign in/create account, then username, then organization name/details, and described the whole UX as garbage and confusing."
  severity: major
  test: 1
  artifacts:
    - path: "frontend/src/routes/auth/sign-in.tsx"
      issue: "Entry-point messaging still frames the problem as sign-in recovery rather than owner-first onboarding."
    - path: "frontend/src/routes/auth/sign-up.tsx"
      issue: "New sign-up page is mechanically separate, but the copy and sequence are not yet designed as a clear onboarding journey."
    - path: "frontend/src/routes/auth/create-company.tsx"
      issue: "Company setup appears as a separate downstream step rather than a clearly staged continuation of account creation."
  missing:
    - "Design a user-facing onboarding sequence that explains identity, account creation, and company setup in one calm flow."
    - "Rework copy and transitions so users never feel they are being asked to sign in again after choosing account creation."
- truth: "Phase 2 frontend should materially match xai-design.html and the approved UI contract, including the login split, owner-first copy, authenticated shell behavior, company switcher experience, and overall visual language."
  status: failed
  reason: "User reported that the app so far does not even look like xai-design.html and called out the current UX as far below the intended product quality."
  severity: major
  test: 1
  artifacts:
    - path: "xai-design.html"
      issue: "Declared source of truth is not being experienced by the user in the implemented auth/onboarding flow."
    - path: ".planning/phases/02-company-access-and-tenant-foundation/02-UI-SPEC.md"
      issue: "UI contract requires preserving xai-design.html login split, authenticated shell, company switcher, settings, audit table, token palette, density, and owner-first tone."
    - path: "frontend/src/routes/auth/sign-in.tsx"
      issue: "Current auth experience may mechanically render but still misses the intended product feel and owner-first clarity."
  missing:
    - "Perform a gap review between implemented frontend screens and xai-design.html/UI-SPEC before more auth UX is shipped."
    - "Plan corrective UI work for auth/onboarding and shell parity as explicit gaps rather than treating visuals as incidental polish."
- truth: "A first-time authenticated user with an active company should either enter a usable workspace immediately or be held in a clear setup-handoff state, without depending entirely on delayed Clerk webhook shadow-row sync."
  status: failed
  reason: "User reported landing in workspace and being told they did not have access to the company on their first visit. Frontend now softens this into setup handoff, but the underlying platform still depends on eventual Clerk webhook/company-membership shadow sync before the workspace can truly open."
  severity: major
  test: 1
  artifacts:
    - path: "frontend/src/routes/root.tsx"
      issue: "Shell now treats active-company 403/404 as setup handoff instead of permission denial, which improves UX but does not remove the underlying dependency on backend sync readiness."
    - path: "frontend/src/routes/auth/create-company.tsx"
      issue: "Company creation now keeps the user in a calmer handoff state, but it still cannot guarantee the workspace is actually ready."
    - path: "backend/app/platform/company_access.py"
      issue: "Backend company access still collapses missing local user/company/membership state into the same 403 used for true forbidden access."
    - path: "backend/app/platform/webhooks.py"
      issue: "Local shadow-row materialization remains webhook-driven, with no explicit authenticated bootstrap/reconciliation path for first-session readiness."
  missing:
    - "Plan and implement an authenticated bootstrap/reconciliation path that can materialize or verify the local user/company/membership shadow rows on first workspace entry."
    - "Differentiate setup-pending company context from true unauthorized access in backend contracts, not only in frontend copy."
- truth: "After first sign-up, the user should not briefly see company setup and then be redirected away into workspace before setup is actually complete."
  status: failed
  reason: "User reported that immediately after first sign-up, the app briefly loads the company setup page, then auto-redirects into workspace, and then shows the 'finishing your company setup' error state. This creates a bait-and-switch onboarding sequence where the product appears to offer setup, then yanks the user out of it before setup has succeeded."
  severity: major
  test: 1
  artifacts:
    - path: "frontend/src/routes/auth/sign-up.tsx"
      issue: "Sign-up currently hands off toward company setup, but the next transition is not stable from the user's perspective."
    - path: "frontend/src/routes/auth/create-company.tsx"
      issue: "Company setup is visible only briefly on first-run, then the user is redirected away before they can complete or trust the step."
    - path: "frontend/src/app/router.tsx"
      issue: "Route-level post-auth redirects still allow first-time users to move into workspace before the onboarding contract is truly complete."
    - path: "frontend/src/routes/root.tsx"
      issue: "Workspace shell then catches the unresolved state and shows setup-handoff messaging, which makes the redirect feel like an error rather than intentional product flow."
  missing:
    - "Plan a deterministic first-run onboarding state machine so sign-up, company setup, and first workspace entry cannot preempt each other."
    - "Remove any automatic redirect from visible setup into workspace until the required company/bootstrap readiness condition is actually satisfied."
