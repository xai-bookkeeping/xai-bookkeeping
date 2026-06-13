---
status: complete
completed: 2026-06-12
task: input-null-value-fix
---

# Summary

Updated the shared Input component to normalize `null` values to empty strings,
preventing React controlled/uncontrolled input warnings on Settings screens.

## Verification

- `npm.cmd run lint`: passed.
