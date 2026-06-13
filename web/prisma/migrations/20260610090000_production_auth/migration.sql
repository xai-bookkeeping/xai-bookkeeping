DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM (
    'USER_REGISTERED',
    'EMAIL_VERIFICATION_SENT',
    'EMAIL_VERIFIED',
    'LOGIN_SUCCEEDED',
    'LOGIN_FAILED',
    'LOGOUT',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "xb_users" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'password'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE "xb_users" RENAME COLUMN "password" TO "password_hash";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'emailVerified'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE "xb_users" RENAME COLUMN "emailVerified" TO "email_verified_at";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'companyName'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE "xb_users" RENAME COLUMN "companyName" TO "company_name";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "xb_users" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "xb_users" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

UPDATE "xb_users"
SET
  "first_name" = COALESCE(NULLIF(split_part("fullName", ' ', 1), ''), 'User'),
  "last_name" = COALESCE(NULLIF(trim(substr("fullName", length(split_part("fullName", ' ', 1)) + 1)), ''), 'Account')
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'xb_users' AND column_name = 'fullName'
);

UPDATE "xb_users"
SET
  "email_verified" = "email_verified_at" IS NOT NULL,
  "status" = CASE WHEN "email_verified_at" IS NOT NULL THEN 'ACTIVE'::"UserStatus" ELSE 'PENDING'::"UserStatus" END;

ALTER TABLE "xb_users" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "xb_users" ALTER COLUMN "last_name" SET NOT NULL;
ALTER TABLE "xb_users" ALTER COLUMN "password_hash" SET NOT NULL;
ALTER TABLE "xb_users" ALTER COLUMN "company_name" DROP NOT NULL;
ALTER TABLE "xb_users" ALTER COLUMN "country" SET DEFAULT 'AE';

ALTER TABLE "xb_users" DROP COLUMN IF EXISTS "fullName";

CREATE INDEX IF NOT EXISTS "xb_users_status_idx" ON "xb_users"("status");
CREATE INDEX IF NOT EXISTS "xb_users_email_verified_idx" ON "xb_users"("email_verified");

DELETE FROM "xb_verification_tokens";
DELETE FROM "xb_password_reset_tokens";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_verification_tokens' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "xb_verification_tokens" RENAME COLUMN "userId" TO "user_id";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_verification_tokens' AND column_name = 'token'
  ) THEN
    ALTER TABLE "xb_verification_tokens" RENAME COLUMN "token" TO "token_hash";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_verification_tokens' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE "xb_verification_tokens" RENAME COLUMN "expiresAt" TO "expires_at";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_verification_tokens' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "xb_verification_tokens" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_password_reset_tokens' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "xb_password_reset_tokens" RENAME COLUMN "userId" TO "user_id";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_password_reset_tokens' AND column_name = 'token'
  ) THEN
    ALTER TABLE "xb_password_reset_tokens" RENAME COLUMN "token" TO "token_hash";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_password_reset_tokens' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE "xb_password_reset_tokens" RENAME COLUMN "expiresAt" TO "expires_at";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_password_reset_tokens' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "xb_password_reset_tokens" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

ALTER TABLE "xb_password_reset_tokens" ADD COLUMN IF NOT EXISTS "used_at" TIMESTAMP(3);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_login_attempts' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "xb_login_attempts" RENAME COLUMN "userId" TO "user_id";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'xb_login_attempts' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "xb_login_attempts" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "xb_verification_tokens_token_hash_key" ON "xb_verification_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "xb_verification_tokens_token_hash_idx" ON "xb_verification_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "xb_verification_tokens_user_id_idx" ON "xb_verification_tokens"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "xb_password_reset_tokens_token_hash_key" ON "xb_password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "xb_password_reset_tokens_token_hash_idx" ON "xb_password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "xb_password_reset_tokens_user_id_idx" ON "xb_password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "xb_login_attempts_email_created_at_idx" ON "xb_login_attempts"("email", "created_at");
CREATE INDEX IF NOT EXISTS "xb_login_attempts_ip_created_at_idx" ON "xb_login_attempts"("ip", "created_at");

CREATE TABLE IF NOT EXISTS "xb_activity_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "email" TEXT,
  "action" "AuditAction" NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xb_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "xb_activity_logs_user_id_created_at_idx" ON "xb_activity_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "xb_activity_logs_email_created_at_idx" ON "xb_activity_logs"("email", "created_at");
CREATE INDEX IF NOT EXISTS "xb_activity_logs_action_created_at_idx" ON "xb_activity_logs"("action", "created_at");

DO $$ BEGIN
  ALTER TABLE "xb_activity_logs"
    ADD CONSTRAINT "xb_activity_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
