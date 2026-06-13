CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'PAID');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_POSTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_PAID';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVOICE_DELETED';

CREATE TABLE "xb_invoices" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issue_date" TIMESTAMP(3) NOT NULL,
  "due_date" TIMESTAMP(3),
  "notes" TEXT,
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "vat_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "posted_by_id" TEXT,
  "posted_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "xb_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_invoice_lines" (
  "id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  "line_subtotal" DECIMAL(12,2) NOT NULL,
  "line_vat" DECIMAL(12,2) NOT NULL,
  "line_total" DECIMAL(12,2) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "xb_invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "xb_invoices_owner_id_invoice_number_key" ON "xb_invoices"("owner_id", "invoice_number");
CREATE INDEX "xb_invoices_owner_id_status_idx" ON "xb_invoices"("owner_id", "status");
CREATE INDEX "xb_invoices_owner_id_issue_date_idx" ON "xb_invoices"("owner_id", "issue_date");
CREATE INDEX "xb_invoices_customer_id_idx" ON "xb_invoices"("customer_id");
CREATE INDEX "xb_invoice_lines_invoice_id_idx" ON "xb_invoice_lines"("invoice_id");

ALTER TABLE "xb_invoices"
  ADD CONSTRAINT "xb_invoices_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_invoices"
  ADD CONSTRAINT "xb_invoices_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "xb_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "xb_invoices"
  ADD CONSTRAINT "xb_invoices_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "xb_invoices"
  ADD CONSTRAINT "xb_invoices_posted_by_id_fkey"
  FOREIGN KEY ("posted_by_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "xb_invoice_lines"
  ADD CONSTRAINT "xb_invoice_lines_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "xb_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
