DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApprovalDocumentType') THEN
    CREATE TYPE "ApprovalDocumentType" AS ENUM ('INVOICE', 'EXPENSE');
  END IF;
END $$;

ALTER TYPE "ExpenseStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';

CREATE TABLE IF NOT EXISTS "xb_approval_routes" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "document_type" "ApprovalDocumentType" NOT NULL,
  "name" TEXT NOT NULL,
  "min_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "max_amount" DECIMAL(12, 2),
  "approver_role" "Role" NOT NULL DEFAULT 'APPROVER',
  "approver_id" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "xb_approval_routes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "xb_approval_routes_owner_id_document_type_active_priority_idx"
  ON "xb_approval_routes"("owner_id", "document_type", "active", "priority");
CREATE INDEX IF NOT EXISTS "xb_approval_routes_approver_id_idx"
  ON "xb_approval_routes"("approver_id");

ALTER TABLE "xb_approval_routes"
  ADD CONSTRAINT "xb_approval_routes_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_invoices"
  ADD COLUMN IF NOT EXISTS "approval_route_id" TEXT,
  ADD COLUMN IF NOT EXISTS "assigned_approver_id" TEXT,
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3);

ALTER TABLE "xb_expenses"
  ADD COLUMN IF NOT EXISTS "approval_route_id" TEXT,
  ADD COLUMN IF NOT EXISTS "assigned_approver_id" TEXT,
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3);

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVAL_ROUTE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVAL_ROUTE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPROVAL_ROUTE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_ASSIGNED_FOR_APPROVAL';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_ASSIGNED_FOR_APPROVAL';
