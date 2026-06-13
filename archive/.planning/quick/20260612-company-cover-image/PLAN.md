---
status: in-progress
created: 2026-06-12
task: company-cover-image
---

# Company Cover Image

Add a company timeline/cover image, similar to a Facebook profile cover, while
keeping the existing company logo functionality.

## Scope

- Add `cover_image_url` to the existing company table.
- Add secure upload/remove API for company cover images.
- Add Company Settings controls for cover upload, preview, replace, and remove.
- Display the cover image in the dashboard hero behind the company workspace
  summary.
- Preserve the existing company logo behavior.
- Run Prisma migration/generate and TypeScript verification.
