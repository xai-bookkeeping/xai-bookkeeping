---
status: in-progress
created: 2026-06-10
task: profile-account-settings
---

# Profile & Account Settings

Extend the existing `web/` NextAuth + Prisma user system with a production account settings module.

## Existing system

- Users live in `xb_users`
- Auth uses NextAuth credentials + JWT
- Passwords are bcrypt hashes in `password_hash`
- Activity logs already live in `xb_activity_logs`
- Dashboard is protected through `auth()` and `web/proxy.ts`

## Scope

- Add profile fields to `xb_users`
- Add company, preferences, and active session models
- Add upload validation/storage for avatar and company logo
- Add account settings UI at `/settings`
- Add secure API endpoints for profile/company/preferences/password/activity/sessions/uploads
- Reuse existing password validation, audit logging, and authentication checks
