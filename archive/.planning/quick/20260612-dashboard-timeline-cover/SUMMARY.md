---
status: completed
completed: 2026-06-12
task: dashboard-timeline-cover
---

# Summary

Made the dashboard hero behave like a proper profile/timeline header.

## Delivered

- Changed the dashboard hero into a visible cover banner with company logo overlapping the lower profile area.
- Uses the uploaded company cover image when available.
- Uses the company theme gradient as the default cover when no image is uploaded.
- Added a clear `Change cover` action on the dashboard.
- Added support for opening Settings directly to the Company tab through `?tab=company`.

## Verification

- Ran `npm.cmd run lint`; TypeScript passed.
