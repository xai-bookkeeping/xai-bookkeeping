import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s().-]{7,24}$/, "Enter a valid phone number")
  .optional()
  .or(z.literal(""));

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color");

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be 32 characters or less")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use only letters, numbers, dots, hyphens, and underscores")
    .optional()
    .or(z.literal("")),
  phone: phoneSchema,
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(500, "Bio must be 500 characters or less").optional().or(z.literal("")),
});

export const companyUpdateSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  website: z.string().trim().url("Enter a valid website URL").optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: phoneSchema,
  address: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(80),
  primaryColor: hexColorSchema.default("#0ea5e9"),
  secondaryColor: hexColorSchema.default("#0f172a"),
  accentColor: hexColorSchema.default("#22c55e"),
  taxNumber: z.string().trim().max(80).optional().or(z.literal("")),
  currency: z.string().trim().min(3).max(3),
  timezone: z.string().trim().min(1).max(80),
});

export const preferencesUpdateSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  language: z.string().trim().min(2).max(12),
  dateFormat: z.enum(["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"]),
  timeFormat: z.enum(["12h", "24h"]),
  currency: z.string().trim().min(3).max(3),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;
