# 02-07 Summary

## Outcome

Implemented the final Phase 2 company settings and audit UI.

- Added the company settings route and reusable `CompanySettingsForm` organism on the generated typed settings endpoints.
- Added the activity and audit route plus `AuditEventTable` organism on the generated typed audit-history endpoint, including empty and denied states.
- Extended the authenticated shell navigation to surface Company settings and Activity & audit alongside the existing workspace and team screens.
- Added a shared frontend test file that covers UAE defaults, audited settings saves, settings permission failures, populated audit history, empty audit history, and denied audit access.

## Files

- `frontend/src/api/index.ts`
- `frontend/src/api/sdk.gen.ts`
- `frontend/src/api/types.gen.ts`
- `frontend/src/app/router.tsx`
- `frontend/src/components/organisms/audit-event-table.tsx`
- `frontend/src/components/organisms/company-settings-form.tsx`
- `frontend/src/routes/root.tsx`
- `frontend/src/routes/workspace/audit/index.tsx`
- `frontend/src/routes/workspace/settings/index.tsx`
- `frontend/src/test/company-settings-audit.test.tsx`

## Verification

- `rtk make gen-types`
- `rtk docker compose run --rm frontend npm run test -- --run src/test/company-settings-audit.test.tsx`
- `rtk make test-backend`
- `rtk make test-frontend`

## Notes

- Settings-save permission denial is surfaced as route-level feedback after the backend rejects the PATCH, while audit-read permission denial renders a calm page-level message with the audit heading still visible.
- The audit export affordance is intentionally visible but disabled, matching the Phase 2 UI contract that keeps export discoverable before the backend export path exists.
