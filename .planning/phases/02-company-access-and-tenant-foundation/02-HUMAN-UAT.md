---
status: partial
phase: 02-company-access-and-tenant-foundation
source:
  - 02-VERIFICATION.md
started: 2026-06-09T07:15:15Z
updated: 2026-06-09T07:15:15Z
---

# Phase 02 Human UAT

## Current Test

[awaiting human testing]

## Tests

### 1. Existing User Sign-In

expected: The user sees the owner-first sign-in screen, authenticates with a real Clerk user who already belongs to a ready company, follows the product-owned post-auth path, and lands in a ready workspace without loops or raw Clerk recovery errors.
result: [pending]

### 2. First-Time OAuth Or Email Onboarding

expected: A new user can sign up with Google or email, create a company, remain on company setup or setup handoff until backend readiness is `ready`, and then open the workspace without bouncing back to sign-in or jumping into workspace early.
result: [pending]

### 3. Authorized Company Switching

expected: After loading company-scoped screens for one real company, switching to a second authorized company shows progress, clears prior company data, avoids previous-company data flash, and lands in either a ready workspace or the setup-handoff state.
result: [pending]

### 4. Live Admin Membership, Settings, And Audit Flow

expected: As an owner or admin, inviting a member, changing a role or revoking access, saving company settings, and reviewing audit history all behave correctly: allowed actions succeed, lower-role denied actions stay denied, and audit entries appear only for the active company.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
