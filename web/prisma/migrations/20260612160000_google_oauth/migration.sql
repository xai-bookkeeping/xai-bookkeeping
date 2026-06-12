DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthProvider') THEN
    CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'EMAIL_AND_GOOGLE');
  END IF;
END $$;

ALTER TABLE "xb_users"
  ADD COLUMN IF NOT EXISTS "google_id" TEXT,
  ADD COLUMN IF NOT EXISTS "auth_provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
  ADD COLUMN IF NOT EXISTS "password_login_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS "xb_users_google_id_key" ON "xb_users"("google_id");
CREATE INDEX IF NOT EXISTS "xb_users_auth_provider_idx" ON "xb_users"("auth_provider");
CREATE INDEX IF NOT EXISTS "xb_users_onboarding_completed_idx" ON "xb_users"("onboarding_completed");

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GOOGLE_ACCOUNT_CONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GOOGLE_ACCOUNT_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ONBOARDING_COMPLETED';
