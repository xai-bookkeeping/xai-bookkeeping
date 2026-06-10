---
status: in-progress
created: 2026-06-10
task: production-auth
---

# Production Authentication

Complete the existing Next.js authentication implementation in `web/` instead of replacing it.

## Existing implementation found

- NextAuth credentials provider in `web/auth.ts`
- Prisma user, verification token, password reset token, and login attempt models
- bcrypt password hashing in `web/lib/tokens.ts`
- SMTP email helpers in `web/lib/email.ts`
- Rate limiting helpers in `web/lib/rate-limit.ts`
- Login, registration, verification, forgot password, reset password pages and forms
- Protected dashboard layout and route proxy

## Work

- Add first/last name, account status, audit logging, and migration artifacts
- Complete session/remember-me handling
- Add reusable audit logging
- Expand email provider abstraction for Resend, SendGrid, and SMTP fallback
- Align registration UI/schema with required fields
- Add verification/reset audit events and safer token handling
- Verify TypeScript/build as far as local dependencies allow
