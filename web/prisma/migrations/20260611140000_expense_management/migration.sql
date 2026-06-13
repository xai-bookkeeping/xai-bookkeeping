CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_PAID';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_DELETED';

CREATE TABLE "xb_expenses" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "expense_date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "attachment_url" TEXT,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "xb_expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "xb_expenses_owner_id_status_idx" ON "xb_expenses"("owner_id", "status");
CREATE INDEX "xb_expenses_owner_id_expense_date_idx" ON "xb_expenses"("owner_id", "expense_date");
CREATE INDEX "xb_expenses_supplier_id_idx" ON "xb_expenses"("supplier_id");
CREATE INDEX "xb_expenses_owner_id_deleted_at_idx" ON "xb_expenses"("owner_id", "deleted_at");

ALTER TABLE "xb_expenses"
  ADD CONSTRAINT "xb_expenses_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_expenses"
  ADD CONSTRAINT "xb_expenses_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "xb_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "xb_expenses"
  ADD CONSTRAINT "xb_expenses_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
