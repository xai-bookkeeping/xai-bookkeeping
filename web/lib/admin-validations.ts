import { z } from "zod";

export const adminRoleMutationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name is required")
    .max(60)
    .transform((value) => value.toUpperCase().startsWith("_") ? value.toUpperCase() : `_${value.toUpperCase()}`),
  description: z.string().trim().max(240).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SYSTEM"]).default("ACTIVE"),
  permissionIds: z.array(z.string().min(1)).default([]),
});

export type AdminRoleMutationInput = z.infer<typeof adminRoleMutationSchema>;
