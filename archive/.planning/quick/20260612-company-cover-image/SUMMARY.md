---
status: complete
completed: 2026-06-12
task: company-cover-image
---

# Summary

Added a company timeline/cover image alongside the existing company logo.

## Delivered

- Added `Company.coverImageUrl` mapped to `xb_companies.cover_image_url`.
- Added company cover migration.
- Added `/api/account/company-cover` upload/remove route.
- Added company cover image storage folder support.
- Added company cover controls to Company Settings.
- Displayed the cover image behind the dashboard hero.
- Added audit events for cover update/remove.

## Verification

- `npm.cmd run db:migrate:deploy`: passed.
- `npm.cmd run db:generate` with `PRISMA_GENERATE_NO_ENGINE=1`: passed for type generation.
- `npm.cmd run lint`: passed.

## Runtime Note

Normal Prisma generation was blocked by the running Next dev server locking the
Windows query engine DLL. Stop the dev server and rerun `npm.cmd run
db:generate` before browser testing.
