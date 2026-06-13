CREATE TYPE "RoleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SYSTEM');
CREATE TYPE "SettingValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'JSON', 'EMAIL');
CREATE TYPE "SqlQueryStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'BLOCKED');

CREATE TABLE "xb_admin_roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "RoleStatus" NOT NULL DEFAULT 'ACTIVE',
  "system_role" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "xb_admin_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_permissions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xb_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_role_permissions" (
  "id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xb_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_user_role_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  "assigned_by_id" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "xb_user_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_reference_data_groups" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "system_group" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "xb_reference_data_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_reference_data_items" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 100,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "xb_reference_data_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_system_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "value_type" "SettingValueType" NOT NULL DEFAULT 'TEXT',
  "description" TEXT,
  "sensitive" BOOLEAN NOT NULL DEFAULT false,
  "updated_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "xb_system_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_sql_saved_queries" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sql_text" TEXT NOT NULL,
  "description" TEXT,
  "read_only" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "xb_sql_saved_queries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "xb_sql_query_history" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "sql_text" TEXT NOT NULL,
  "status" "SqlQueryStatus" NOT NULL DEFAULT 'SUCCEEDED',
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "duration_ms" INTEGER,
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "xb_sql_query_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "xb_admin_roles_name_key" ON "xb_admin_roles"("name");
CREATE INDEX "xb_admin_roles_status_idx" ON "xb_admin_roles"("status");
CREATE UNIQUE INDEX "xb_permissions_key_key" ON "xb_permissions"("key");
CREATE INDEX "xb_permissions_module_idx" ON "xb_permissions"("module");
CREATE UNIQUE INDEX "xb_role_permissions_role_id_permission_id_key" ON "xb_role_permissions"("role_id", "permission_id");
CREATE INDEX "xb_role_permissions_permission_id_idx" ON "xb_role_permissions"("permission_id");
CREATE UNIQUE INDEX "xb_user_role_assignments_user_id_role_id_key" ON "xb_user_role_assignments"("user_id", "role_id");
CREATE INDEX "xb_user_role_assignments_role_id_active_idx" ON "xb_user_role_assignments"("role_id", "active");
CREATE INDEX "xb_user_role_assignments_user_id_active_idx" ON "xb_user_role_assignments"("user_id", "active");
CREATE UNIQUE INDEX "xb_reference_data_groups_key_key" ON "xb_reference_data_groups"("key");
CREATE INDEX "xb_reference_data_groups_active_idx" ON "xb_reference_data_groups"("active");
CREATE UNIQUE INDEX "xb_reference_data_items_group_id_code_key" ON "xb_reference_data_items"("group_id", "code");
CREATE INDEX "xb_reference_data_items_group_id_active_sort_order_idx" ON "xb_reference_data_items"("group_id", "active", "sort_order");
CREATE UNIQUE INDEX "xb_system_settings_key_key" ON "xb_system_settings"("key");
CREATE INDEX "xb_system_settings_module_idx" ON "xb_system_settings"("module");
CREATE INDEX "xb_sql_saved_queries_owner_id_created_at_idx" ON "xb_sql_saved_queries"("owner_id", "created_at");
CREATE INDEX "xb_sql_query_history_owner_id_created_at_idx" ON "xb_sql_query_history"("owner_id", "created_at");
CREATE INDEX "xb_sql_query_history_status_created_at_idx" ON "xb_sql_query_history"("status", "created_at");

ALTER TABLE "xb_role_permissions" ADD CONSTRAINT "xb_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "xb_admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "xb_role_permissions" ADD CONSTRAINT "xb_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "xb_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "xb_user_role_assignments" ADD CONSTRAINT "xb_user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "xb_user_role_assignments" ADD CONSTRAINT "xb_user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "xb_admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "xb_user_role_assignments" ADD CONSTRAINT "xb_user_role_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "xb_reference_data_items" ADD CONSTRAINT "xb_reference_data_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "xb_reference_data_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "xb_system_settings" ADD CONSTRAINT "xb_system_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "xb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "xb_sql_saved_queries" ADD CONSTRAINT "xb_sql_saved_queries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "xb_sql_query_history" ADD CONSTRAINT "xb_sql_query_history_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "xb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ROLE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ROLE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ROLE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ROLE_CLONED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_PERMISSION_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_PERMISSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_USER_ROLE_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_USER_ROLE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REFERENCE_DATA_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REFERENCE_DATA_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REFERENCE_DATA_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SYSTEM_SETTING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SQL_QUERY_EXECUTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SQL_QUERY_BLOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SQL_QUERY_SAVED';

INSERT INTO "xb_admin_roles" ("id", "name", "description", "status", "system_role", "updated_at")
VALUES
  ('role_admin', '_ADMIN', 'Full system administration access.', 'SYSTEM', true, CURRENT_TIMESTAMP),
  ('role_accountant', '_ACCOUNTANT', 'Daily finance operations and posting.', 'SYSTEM', true, CURRENT_TIMESTAMP),
  ('role_approver', '_APPROVER', 'Reviews and approves submitted finance documents.', 'SYSTEM', true, CURRENT_TIMESTAMP),
  ('role_auditor', '_AUDITOR', 'Read-only audit, reporting, and compliance review.', 'SYSTEM', true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "xb_user_role_assignments" ("id", "user_id", "role_id", "active")
SELECT 'ura_' || u."id" || '_' || lower(u."role"::text), u."id",
  CASE
    WHEN u."role"::text = 'ADMIN' THEN 'role_admin'
    WHEN u."role"::text = 'APPROVER' THEN 'role_approver'
    WHEN u."role"::text = 'VIEWER' THEN 'role_auditor'
    ELSE 'role_accountant'
  END,
  true
FROM "xb_users" u
ON CONFLICT ("user_id", "role_id") DO NOTHING;
