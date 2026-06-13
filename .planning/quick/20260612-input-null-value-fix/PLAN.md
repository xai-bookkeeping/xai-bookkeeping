---
status: in-progress
created: 2026-06-12
task: input-null-value-fix
---

# Input Null Value Fix

Fix React controlled input warnings caused by `null` values reaching the shared
Input component.

## Scope

- Normalize `null` input values to empty strings in the shared Input component.
- Preserve existing controlled and uncontrolled input behavior.
- Run TypeScript verification.
