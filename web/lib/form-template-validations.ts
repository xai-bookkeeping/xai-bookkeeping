import { z } from "zod";

export const formFieldEntryModes = ["USER_ENTRY", "MANDATORY", "DISPLAY_ONLY", "NOT_DISPLAYED"] as const;
export const formFieldTypes = ["TEXT", "TEXTAREA", "INTEGER", "NUMBER", "MONEY", "BOOLEAN", "DATE", "DATE_TIME", "EMAIL", "PHONE", "URL", "LIST"] as const;

export const formFieldMutationSchema = z.object({
  allowUserEntry: z.boolean().default(true),
  defaultValue: z.string().max(500).optional().nullable(),
  dependsOn: z.string().max(120).optional().nullable(),
  entryMode: z.enum(formFieldEntryModes),
  fieldLabel: z.string().trim().min(1, "Field label is required.").max(120),
  fieldName: z
    .string()
    .trim()
    .min(1, "Field name is required.")
    .max(80)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Field name must start with a letter and use only letters, numbers, or underscores."),
  fieldType: z.enum(formFieldTypes),
  formula: z.string().max(1000).optional().nullable(),
  groupTitle: z.string().trim().max(80).optional().nullable(),
  hasFormula: z.boolean().default(false),
  listKey: z.string().trim().max(80).optional().nullable(),
  resetToNull: z.boolean().default(false),
  scanField: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(100000).default(100),
});

export const formFieldPatchSchema = formFieldMutationSchema.partial().extend({
  active: z.boolean().optional(),
});
