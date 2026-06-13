import { z } from "zod";

export const approvalDocumentTypes = ["INVOICE", "EXPENSE"] as const;
export const approvalRouteRoles = ["ADMIN", "ACCOUNTANT", "APPROVER"] as const;

const approvalRouteBaseSchema = z.object({
  active: z.boolean().optional().default(true),
  approverId: z.string().trim().optional().nullable(),
  approverRole: z.enum(approvalRouteRoles).default("APPROVER"),
  documentType: z.enum(approvalDocumentTypes),
  maxAmount: z.coerce.number().nonnegative().optional().nullable(),
  minAmount: z.coerce.number().nonnegative().default(0),
  name: z.string().trim().min(2, "Route name is required.").max(120),
  priority: z.coerce.number().int().min(1).max(999).default(100),
});

export const approvalRouteSchema = approvalRouteBaseSchema.refine(
  (data) => data.maxAmount == null || data.maxAmount >= data.minAmount,
  {
    message: "Maximum amount must be greater than or equal to minimum amount.",
    path: ["maxAmount"],
  },
);

export const approvalRouteUpdateSchema = approvalRouteBaseSchema.partial();

export type ApprovalRouteInput = z.infer<typeof approvalRouteSchema>;
