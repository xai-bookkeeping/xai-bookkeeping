import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.string().email("Enter a valid email address").nullable());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .optional()
    .nullable();

export const supplierListQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const supplierMutationSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(180),
  contactPerson: optionalText(140),
  email: optionalEmail.optional().nullable(),
  phone: optionalText(40),
  address: optionalText(500),
  trn: optionalText(40),
});

export type SupplierMutationInput = z.infer<typeof supplierMutationSchema>;
