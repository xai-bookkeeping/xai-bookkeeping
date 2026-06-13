---
status: in-progress
created: 2026-06-12
task: google-oauth-authentication
---

# Google OAuth Authentication

Implement Google sign-in/sign-up as an extension of the existing Auth.js,
Prisma, settings, sessions, and audit-log implementation.

## Scope

- Add Google as a second Auth.js provider without replacing credentials auth.
- Extend the existing `User` model with Google identity, provider, password-login,
  and onboarding state fields.
- Prevent duplicate accounts by linking Google profiles by verified email.
- Create default company records for first-time Google signups.
- Add Google sign-in buttons to login and registration.
- Add onboarding wizard for first Google signup.
- Add Settings > Security controls for Google connection state and disconnect.
- Surface account type and Google avatar/provider information in profile UI.
- Add migration, regenerate Prisma client, typecheck/build, then commit.

## Verification

- Prisma client generation succeeds.
- TypeScript typecheck succeeds.
- Production build succeeds or failures are documented.
- Git commit message: `feat(auth): add Google OAuth authentication`.
