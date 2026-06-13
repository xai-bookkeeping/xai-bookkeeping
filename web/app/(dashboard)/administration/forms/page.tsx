import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPageHeader, AdminStat, AdminTabBar } from "@/components/administration/AdminShell";
import { FormDesignerClient } from "@/components/administration/FormDesignerClient";
import { ensureAdminDefaults } from "@/lib/admin-defaults";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Form field designer" };

export default async function FormFieldDesignerPage() {
  const session = await auth();
  if (!session || session.sessionExpired) redirect("/login");

  await ensureAdminDefaults();

  const [templates, referenceGroups] = await Promise.all([
    db.formTemplate.findMany({
      orderBy: { name: "asc" },
      include: { fields: { orderBy: [{ sortOrder: "asc" }, { fieldLabel: "asc" }] } },
    }),
    db.referenceDataGroup.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, key: true, name: true },
    }),
  ]);

  const fieldCount = templates.reduce((total, template) => total + template.fields.length, 0);
  const mandatoryCount = templates.reduce((total, template) => total + template.fields.filter((field) => field.entryMode === "MANDATORY").length, 0);
  const listCount = templates.reduce((total, template) => total + template.fields.filter((field) => field.fieldType === "LIST").length, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Form Field Designer"
        description="Configure the fields used by operational forms. Add fields, hide fields, mark mandatory fields, assign lists, set formulas, and control display behavior."
      />
      <AdminTabBar />
      <div className="grid gap-3 md:grid-cols-4">
        <AdminStat label="Forms" value={templates.length} helper="Configurable templates" />
        <AdminStat label="Fields" value={fieldCount} helper="Across all forms" />
        <AdminStat label="Mandatory" value={mandatoryCount} helper="Required by admin" />
        <AdminStat label="Assigned Lists" value={listCount} helper="Fields backed by lookup tables" />
      </div>
      <FormDesignerClient
        initialTemplates={templates.map((template) => ({
          active: template.active,
          description: template.description,
          fields: template.fields.map((field) => ({
            active: field.active,
            allowUserEntry: field.allowUserEntry,
            defaultValue: field.defaultValue,
            dependsOn: field.dependsOn,
            entryMode: field.entryMode,
            fieldLabel: field.fieldLabel,
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            formula: field.formula,
            groupTitle: field.groupTitle,
            hasFormula: field.hasFormula,
            id: field.id,
            listKey: field.listKey,
            resetToNull: field.resetToNull,
            scanField: field.scanField,
            sortOrder: field.sortOrder,
            systemField: field.systemField,
          })),
          id: template.id,
          key: template.key,
          name: template.name,
        }))}
        referenceGroups={referenceGroups}
      />
    </div>
  );
}
