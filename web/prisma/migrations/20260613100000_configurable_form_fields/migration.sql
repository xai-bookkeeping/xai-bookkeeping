-- CreateEnum
CREATE TYPE "FormFieldEntryMode" AS ENUM ('USER_ENTRY', 'MANDATORY', 'DISPLAY_ONLY', 'NOT_DISPLAYED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'INTEGER', 'NUMBER', 'MONEY', 'BOOLEAN', 'DATE', 'DATE_TIME', 'EMAIL', 'PHONE', 'URL', 'LIST');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FORM_TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FORM_FIELD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FORM_FIELD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FORM_FIELD_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'FORM_FIELD_REORDERED';

-- CreateTable
CREATE TABLE "xb_form_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xb_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xb_form_field_definitions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_label" TEXT NOT NULL,
    "group_title" TEXT,
    "entry_mode" "FormFieldEntryMode" NOT NULL DEFAULT 'USER_ENTRY',
    "field_type" "FormFieldType" NOT NULL DEFAULT 'TEXT',
    "default_value" TEXT,
    "formula" TEXT,
    "has_formula" BOOLEAN NOT NULL DEFAULT false,
    "scan_field" BOOLEAN NOT NULL DEFAULT false,
    "depends_on" TEXT,
    "list_key" TEXT,
    "allow_user_entry" BOOLEAN NOT NULL DEFAULT true,
    "reset_to_null" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "system_field" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xb_form_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xb_form_templates_key_key" ON "xb_form_templates"("key");

-- CreateIndex
CREATE INDEX "xb_form_templates_active_idx" ON "xb_form_templates"("active");

-- CreateIndex
CREATE UNIQUE INDEX "xb_form_field_definitions_template_id_field_name_key" ON "xb_form_field_definitions"("template_id", "field_name");

-- CreateIndex
CREATE INDEX "xb_form_field_definitions_template_id_active_sort_order_idx" ON "xb_form_field_definitions"("template_id", "active", "sort_order");

-- CreateIndex
CREATE INDEX "xb_form_field_definitions_list_key_idx" ON "xb_form_field_definitions"("list_key");

-- AddForeignKey
ALTER TABLE "xb_form_templates" ADD CONSTRAINT "xb_form_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xb_form_field_definitions" ADD CONSTRAINT "xb_form_field_definitions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "xb_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xb_form_field_definitions" ADD CONSTRAINT "xb_form_field_definitions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
