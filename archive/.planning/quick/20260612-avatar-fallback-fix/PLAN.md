---
status: in-progress
created: 2026-06-12
task: avatar-fallback-fix
---

# Avatar Fallback Fix

Fix broken avatar image rendering in the app shell after Google OAuth login.

## Scope

- Update the shared app-shell avatar renderer to fall back to initials when an
  external avatar URL fails to load.
- Keep the existing UI layout unchanged.
- Run TypeScript verification.
