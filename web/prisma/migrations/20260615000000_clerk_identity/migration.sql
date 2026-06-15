-- Greenfield auth reset: Clerk owns identity, Postgres keeps app profile/RBAC.

DROP TABLE IF EXISTS "xb_user_sessions";
DROP TABLE IF EXISTS "xb_user_invitations";
DROP TABLE IF EXISTS "xb_verification_tokens";
DROP TABLE IF EXISTS "xb_password_reset_tokens";
DROP TABLE IF EXISTS "xb_login_attempts";

ALTER TABLE "xb_users"
  ADD COLUMN "clerk_user_id" TEXT,
  DROP COLUMN "session_version",
  DROP COLUMN "google_id",
  DROP COLUMN "auth_provider",
  DROP COLUMN "password_login_enabled",
  DROP COLUMN "password_hash",
  DROP COLUMN "email_verified",
  DROP COLUMN "email_verified_at";

UPDATE "xb_users"
SET "clerk_user_id" = 'legacy_' || "id"
WHERE "clerk_user_id" IS NULL;

ALTER TABLE "xb_users"
  ALTER COLUMN "clerk_user_id" SET NOT NULL;

CREATE UNIQUE INDEX "xb_users_clerk_user_id_key" ON "xb_users"("clerk_user_id");
CREATE INDEX "xb_users_clerk_user_id_idx" ON "xb_users"("clerk_user_id");

DROP TYPE IF EXISTS "AuthProvider";
