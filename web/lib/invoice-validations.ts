import { z } from "zod";

export const invoiceStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "PAID"] as const;

export const invoiceListQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(invoiceStatuses).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Line description is required").max(240),
  quantity: z.coerce.number().positive("Quantity must be greater than zero").max(999999),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative").max(99999999),
  vatRate: z.coerce.number().min(0).max(100).optional().default(5),
});

export const invoiceMutationSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1, "At least one line item is required"),
});

export const invoiceStatusActionSchema = z.object({
  action: z.enum(["submit", "approve", "post", "markPaid"]),
});

export type InvoiceMutationInput = z.infer<typeof invoiceMutationSchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;
