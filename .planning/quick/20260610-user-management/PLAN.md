---
status: in-progress
stage: 3
---

# Stage 3: User Management

Build admin-facing user management on the existing NextAuth/Prisma user system.

## Scope

- Extend the existing `User` model and `Role` enum for Admin, Accountant, Approver, and Viewer.
- Add secure one-time user invitations.
- Add admin-only APIs to list, create, invite, edit, deactivate/reactivate users, assign roles, resend verification, and trigger password reset.
- Add a responsive Users page with search, role/status filters, table layout, and create/invite/edit flows.
- Audit all administrative user actions.
- Preserve existing auth/profile functionality.

## Verification

- Apply Prisma migration.
- Generate Prisma client.
- Run TypeScript validation.
- Run lint script.
- Run production build.
- Commit with `feat(users): user management`.
