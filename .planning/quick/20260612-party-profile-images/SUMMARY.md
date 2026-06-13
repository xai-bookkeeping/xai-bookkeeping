---
status: completed
completed: 2026-06-12
task: party-profile-images
---

# Summary

Added customer and supplier logo/timeline image management.

## Delivered

- Added `logo_url` and `cover_image_url` to customers and suppliers.
- Added secure upload/remove endpoints for customer logos and covers.
- Added secure upload/remove endpoints for supplier logos and covers.
- Added header controls directly on customer and supplier profile pages.
- Profile pages now display uploaded logos and cover images.
- Added audit events for profile image changes.

## Verification

- Applied database migrations.
- Ran `npm.cmd run lint`; TypeScript passed.

## Note

- `npm.cmd run db:generate` was blocked by the Windows Prisma query engine DLL because the dev server was running.
