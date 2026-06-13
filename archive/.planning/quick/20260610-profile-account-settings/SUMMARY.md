---
status: complete
completed: 2026-06-10
task: profile-account-settings
---

# Summary

Implemented the account settings module in the existing `web/` NextAuth + Prisma app.

## Implemented

- `/settings` page with Profile, Company, Security, Preferences, and Activity sections.
- Profile editing for first name, last name, display name, username, phone, job title, and bio.
- Avatar upload/remove with local storage, type validation, and 5MB size limit.
- Company settings and company logo upload/remove.
- Password change with current-password verification and strong-password validation.
- User preferences persisted in the database.
- Account activity display with filtering.
- Active session tracking and revoke endpoints.
- Dashboard header company logo integration.

## Verified

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `npm.cmd run build`
