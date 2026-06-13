import { db } from "@/lib/db";

export type RuntimeFormField = {
  allowUserEntry: boolean;
  defaultValue: string | null;
  dependsOn: string | null;
  entryMode: "USER_ENTRY" | "MANDATORY" | "DISPLAY_ONLY" | "NOT_DISPLAYED";
  fieldLabel: string;
  fieldName: string;
  fieldType: string;
  formula: string | null;
  groupTitle: string | null;
  hasFormula: boolean;
  listKey: string | null;
  scanField: boolean;
  sortOrder: number;
};

export type RuntimeFormConfig = {
  fields: RuntimeFormField[];
  key: string;
  name: string;
};

export async function getRuntimeFormConfig(key: string): Promise<RuntimeFormConfig | null> {
  const template = await db.formTemplate.findUnique({
    where: { key },
    include: {
      fields: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { fieldLabel: "asc" }],
      },
    },
  });

  if (!template || !template.active) return null;

  return {
    fields: template.fields.map((field) => ({
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
      listKey: field.listKey,
      scanField: field.scanField,
      sortOrder: field.sortOrder,
    })),
    key: template.key,
    name: template.name,
  };
}
