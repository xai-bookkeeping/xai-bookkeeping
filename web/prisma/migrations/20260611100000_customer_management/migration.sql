ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CUSTOMER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CUSTOMER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CUSTOMER_DELETED';

CREATE TABLE "xb_customers" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact_person" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "trn" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "xb_customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "xb_customers_owner_id_deleted_at_idx" ON "xb_customers"("owner_id", "deleted_at");
CREATE INDEX "xb_customers_owner_id_name_idx" ON "xb_customers"("owner_id", "name");
CREATE INDEX "xb_customers_owner_id_email_idx" ON "xb_customers"("owner_id", "email");

ALTER TABLE "xb_customers"
  ADD CONSTRAINT "xb_customers_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
