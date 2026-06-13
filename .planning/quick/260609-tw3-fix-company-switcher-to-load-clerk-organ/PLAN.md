---
status: complete
created_at: 2026-06-09T17:31:18.243Z
---

# Fix Company Switcher Membership Loading

Task: Fix company switcher to load Clerk organization memberships.

## Plan

1. Confirm how `CompanySwitcher` gets the list of switchable companies.
2. Compare the component with the installed Clerk `useOrganizationList` contract.
3. Add a regression test that mirrors Clerk's opt-in membership loading behavior.
4. Update `CompanySwitcher` to request memberships explicitly.
5. Run the focused switcher test suite and restart the frontend app.
