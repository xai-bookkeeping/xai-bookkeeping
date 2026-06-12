---
status: complete
completed: 2026-06-12
task: google-oauth-authentication
---

# Summary

Implemented Google OAuth as an extension of the existing Auth.js credentials
authentication system.

## Delivered

- Google sign-in/sign-up button on login and registration.
- Verified Google email linking by `googleId` and normalized email.
- Duplicate account prevention for same email / conflicting Google identities.
- Google-created users with first name, last name, display name, avatar, verified
  email, default company, and pending onboarding state.
- Onboarding wizard for company name, TRN, company logo, and finish.
- Settings > Security Google connect/disconnect UI.
- Account type display in profile/security settings.
- Prisma migration for Google identity/provider/password-login/onboarding fields.
- Audit actions for Google connect/disconnect and onboarding completion.

## Verification

- `npm.cmd run db:generate` with `PRISMA_GENERATE_NO_ENGINE=1`: passed.
- `npm.cmd run db:migrate:deploy`: passed and applied `20260612160000_google_oauth`.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
