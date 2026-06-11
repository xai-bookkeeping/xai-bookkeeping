ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUPPLIER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUPPLIER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUPPLIER_DELETED';

CREATE TABLE "xb_suppliers" (
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

  CONSTRAINT "xb_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "xb_suppliers_owner_id_deleted_at_idx" ON "xb_suppliers"("owner_id", "deleted_at");
CREATE INDEX "xb_suppliers_owner_id_name_idx" ON "xb_suppliers"("owner_id", "name");
CREATE INDEX "xb_suppliers_owner_id_email_idx" ON "xb_suppliers"("owner_id", "email");

ALTER TABLE "xb_suppliers"
  ADD CONSTRAINT "xb_suppliers_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
