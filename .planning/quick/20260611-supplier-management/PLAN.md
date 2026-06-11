---
status: in-progress
stage: 5
---

# Stage 5: Supplier Management

Build production-ready supplier management on the existing authenticated web app.

## Scope

- Add a `Supplier` model scoped to the authenticated owner.
- Add create, list, update, and delete API endpoints with search and pagination.
- Add server-side validation for supplier name, contact person, email, phone, address, and TRN.
- Add a responsive `/suppliers` page with table, search, pagination, create form, edit panel, and delete action.
- Add audit logging for supplier create/update/delete actions.
- Add dashboard navigation entry.

## Verification

- Apply Prisma migration.
- Generate Prisma client.
- Run TypeScript validation.
- Run lint script.
- Run production build.
- Commit with `feat(vendors): supplier management`.
