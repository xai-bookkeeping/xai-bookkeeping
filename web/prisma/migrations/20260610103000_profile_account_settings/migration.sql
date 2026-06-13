ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROFILE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AVATAR_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AVATAR_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPANY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPANY_LOGO_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMPANY_LOGO_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PREFERENCES_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SESSIONS_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SESSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_PLACEHOLDER_VIEWED';

DO $$ BEGIN
  CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "job_title" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "session_version" INTEGER NOT NULL DEFAULT 1;

UPDATE "xb_users"
SET "display_name" = COALESCE("display_name", trim("first_name" || ' ' || "last_name"));

CREATE UNIQUE INDEX IF NOT EXISTS "xb_users_username_key" ON "xb_users"("username");
CREATE INDEX IF NOT EXISTS "xb_users_username_idx" ON "xb_users"("username");

CREATE TABLE IF NOT EXISTS "xb_companies" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logo_url" TEXT,
  "website" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'AE',
  "tax_number" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xb_companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "xb_companies_owner_id_key" ON "xb_companies"("owner_id");
CREATE INDEX IF NOT EXISTS "xb_companies_owner_id_idx" ON "xb_companies"("owner_id");

DO $$ BEGIN
  ALTER TABLE "xb_companies"
    ADD CONSTRAINT "xb_companies_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "xb_companies" ("id", "owner_id", "name", "email", "country", "currency", "timezone")
SELECT
  'company_' || "id",
  "id",
  COALESCE("company_name", trim("first_name" || ' ' || "last_name") || '''s Company'),
  "email",
  COALESCE("country", 'AE'),
  'AED',
  'Asia/Dubai'
FROM "xb_users"
ON CONFLICT ("owner_id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "xb_user_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
  "language" TEXT NOT NULL DEFAULT 'en',
  "date_format" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  "time_format" TEXT NOT NULL DEFAULT '24h',
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xb_user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "xb_user_preferences_user_id_key" ON "xb_user_preferences"("user_id");

DO $$ BEGIN
  ALTER TABLE "xb_user_preferences"
    ADD CONSTRAINT "xb_user_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "xb_user_preferences" ("id", "user_id")
SELECT 'prefs_' || "id", "id"
FROM "xb_users"
ON CONFLICT ("user_id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "xb_user_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "xb_user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "xb_user_sessions_user_id_revoked_at_idx" ON "xb_user_sessions"("user_id", "revoked_at");
CREATE INDEX IF NOT EXISTS "xb_user_sessions_expires_at_idx" ON "xb_user_sessions"("expires_at");

DO $$ BEGIN
  ALTER TABLE "xb_user_sessions"
    ADD CONSTRAINT "xb_user_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
