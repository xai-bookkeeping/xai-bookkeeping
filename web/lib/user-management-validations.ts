import { z } from "zod";

export const managedRoles = ["ADMIN", "ACCOUNTANT", "APPROVER", "VIEWER"] as const;
export const managedStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "DISABLED"] as const;

export const userListQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  role: z.enum(managedRoles).optional(),
  status: z.enum(managedStatuses).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const inviteUserSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase(),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  role: z.enum(managedRoles).default("ACCOUNTANT"),
});

export const updateManagedUserSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().optional(),
  firstName: z.string().trim().min(1, "First name is required").max(80).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(80).optional(),
  displayName: z.string().trim().max(120).optional().nullable(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, dots, dashes, and underscores")
    .optional()
    .nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
  role: z.enum(managedRoles).optional(),
  roleIds: z.array(z.string().min(1)).optional(),
  status: z.enum(managedStatuses).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateManagedUserInput = z.infer<typeof updateManagedUserSchema>;
