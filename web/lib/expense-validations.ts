import { z } from "zod";

export const expenseStatuses = ["DRAFT", "APPROVED", "PAID"] as const;

export const expenseListQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(expenseStatuses).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const expenseMutationSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  category: z.string().trim().min(1, "Category is required").max(120),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(99999999),
  expenseDate: z.string().min(1, "Expense date is required"),
  notes: z.string().trim().max(1000).optional().nullable(),
  attachmentUrl: z
    .string()
    .trim()
    .url("Enter a valid attachment URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

export const expenseStatusActionSchema = z.object({
  action: z.enum(["submit", "approve", "markPaid"]),
});

export type ExpenseMutationInput = z.infer<typeof expenseMutationSchema>;
