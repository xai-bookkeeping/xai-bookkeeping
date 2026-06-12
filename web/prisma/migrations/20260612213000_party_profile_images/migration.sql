ALTER TABLE "xb_customers"
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;

ALTER TABLE "xb_suppliers"
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
