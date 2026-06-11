CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAYMENT_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAYMENT_DELETED';

CREATE TABLE "xb_payments" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "payment_date" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "xb_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "xb_payments_owner_id_deleted_at_idx" ON "xb_payments"("owner_id", "deleted_at");
CREATE INDEX "xb_payments_invoice_id_idx" ON "xb_payments"("invoice_id");
CREATE INDEX "xb_payments_payment_date_idx" ON "xb_payments"("payment_date");

ALTER TABLE "xb_payments"
  ADD CONSTRAINT "xb_payments_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "xb_payments"
  ADD CONSTRAINT "xb_payments_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "xb_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
