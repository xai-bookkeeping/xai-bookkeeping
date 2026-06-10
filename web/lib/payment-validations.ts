import { z } from "zod";

export const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE"] as const;

export const paymentListQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const paymentMutationSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(99999999),
  method: z.enum(paymentMethods),
  paymentDate: z.string().min(1, "Payment date is required"),
  reference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type PaymentMutationInput = z.infer<typeof paymentMutationSchema>;
