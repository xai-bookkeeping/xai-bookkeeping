---
status: completed
completed: 2026-06-13
task: login-role-query-window
---

# Summary

Added login role selection and expanded the SQL query window.

## Delivered

- Added `/api/auth/roles` to return roles assigned to a typed email address.
- Added `Login As` role dropdown to the email/password login form.
- Credentials login now validates and stores the selected role in JWT/session.
- Updated session typing with selected and assigned roles.
- Query Window now supports single-statement `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- Query Window blocks schema/admin commands and multi-statement batches.
- Query Window UI now has a command toolbar, editor, result grid, export, duration, and affected-row feedback.
- Removed external product reference names from UI and planning notes.

## Verification

- Ran `npm.cmd run lint`; TypeScript passed.
