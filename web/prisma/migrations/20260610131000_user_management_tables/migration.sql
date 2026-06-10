ALTER TABLE "xb_users" ALTER COLUMN "role" SET DEFAULT 'ACCOUNTANT';
UPDATE "xb_users" SET "role" = 'ACCOUNTANT' WHERE "role" = 'USER';

CREATE TABLE "xb_user_invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'ACCOUNTANT',
  "token_hash" TEXT NOT NULL,
  "invited_by_id" TEXT NOT NULL,
  "user_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "xb_user_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "xb_user_invitations_token_hash_key" ON "xb_user_invitations"("token_hash");
CREATE INDEX "xb_user_invitations_email_created_at_idx" ON "xb_user_invitations"("email", "created_at");
CREATE INDEX "xb_user_invitations_invited_by_id_idx" ON "xb_user_invitations"("invited_by_id");
CREATE INDEX "xb_user_invitations_user_id_idx" ON "xb_user_invitations"("user_id");
CREATE INDEX "xb_user_invitations_expires_at_idx" ON "xb_user_invitations"("expires_at");

ALTER TABLE "xb_user_invitations"
  ADD CONSTRAINT "xb_user_invitations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_user_invitations"
  ADD CONSTRAINT "xb_user_invitations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
