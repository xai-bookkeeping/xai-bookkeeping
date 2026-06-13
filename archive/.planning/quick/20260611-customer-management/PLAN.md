---
status: in-progress
stage: 4
---

# Stage 4: Customer Management

Build production-ready customer management on the existing authenticated web app.

## Scope

- Add a `Customer` model scoped to the authenticated owner.
- Add create, list, update, and delete API endpoints with search and pagination.
- Add server-side validation for customer name, contact person, email, phone, address, and TRN.
- Add a responsive `/customers` page with table, search, pagination, create form, edit panel, and delete action.
- Add audit logging for customer create/update/delete actions.
- Add dashboard navigation entry.

## Verification

- Apply Prisma migration.
- Generate Prisma client.
- Run TypeScript validation.
- Run lint script.
- Run production build.
- Commit with `feat(customers): customer management`.
