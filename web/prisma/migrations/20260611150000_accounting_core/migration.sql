CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'INVOICE', 'PAYMENT', 'EXPENSE', 'SYSTEM');

CREATE TABLE "xb_accounts" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "AccountType" NOT NULL,
  "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "description" TEXT,
  "system_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "xb_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_journal_entries" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "entry_number" TEXT NOT NULL,
  "entry_date" TIMESTAMP(3) NOT NULL,
  "status" "JournalStatus" NOT NULL DEFAULT 'POSTED',
  "source_type" "SourceType" NOT NULL,
  "source_id" TEXT,
  "memo" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xb_journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_journal_lines" (
  "id" TEXT NOT NULL,
  "journal_entry_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "xb_journal_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "xb_accounts_owner_id_code_key" ON "xb_accounts"("owner_id", "code");
CREATE UNIQUE INDEX "xb_accounts_owner_id_system_key_key" ON "xb_accounts"("owner_id", "system_key");
CREATE INDEX "xb_accounts_owner_id_type_idx" ON "xb_accounts"("owner_id", "type");
CREATE INDEX "xb_accounts_owner_id_status_idx" ON "xb_accounts"("owner_id", "status");
CREATE INDEX "xb_accounts_owner_id_deleted_at_idx" ON "xb_accounts"("owner_id", "deleted_at");

CREATE UNIQUE INDEX "xb_journal_entries_owner_id_entry_number_key" ON "xb_journal_entries"("owner_id", "entry_number");
CREATE INDEX "xb_journal_entries_owner_id_entry_date_idx" ON "xb_journal_entries"("owner_id", "entry_date");
CREATE INDEX "xb_journal_entries_owner_id_source_type_source_id_idx" ON "xb_journal_entries"("owner_id", "source_type", "source_id");

CREATE INDEX "xb_journal_lines_journal_entry_id_idx" ON "xb_journal_lines"("journal_entry_id");
CREATE INDEX "xb_journal_lines_account_id_idx" ON "xb_journal_lines"("account_id");

ALTER TABLE "xb_accounts"
  ADD CONSTRAINT "xb_accounts_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_journal_entries"
  ADD CONSTRAINT "xb_journal_entries_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_journal_lines"
  ADD CONSTRAINT "xb_journal_lines_journal_entry_id_fkey"
  FOREIGN KEY ("journal_entry_id") REFERENCES "xb_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_journal_lines"
  ADD CONSTRAINT "xb_journal_lines_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "xb_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "xb_journal_lines"
  ADD CONSTRAINT "xb_journal_lines_non_negative_check"
  CHECK ("debit" >= 0 AND "credit" >= 0);

ALTER TABLE "xb_journal_lines"
  ADD CONSTRAINT "xb_journal_lines_one_side_check"
  CHECK (("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0));

