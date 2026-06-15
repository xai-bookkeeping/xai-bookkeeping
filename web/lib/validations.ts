import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
  selectedRole: z.string().trim().optional().default(""),
  remember: z
    .preprocess((value) => value === true || value === "true" || value === "on", z.boolean())
    .optional()
    .default(false),
});

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(80, "First name must be 80 characters or less"),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(80, "Last name must be 80 characters or less"),
    email: z.string().email("Enter a valid email address").toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
    token: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score < 30) return { score, label: "Weak", color: "bg-red-500" };
  if (score < 55) return { score, label: "Fair", color: "bg-amber-500" };
  if (score < 75) return { score, label: "Good", color: "bg-sky-500" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

export const COUNTRIES = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "KW", name: "Kuwait" },
  { code: "BH", name: "Bahrain" },
  { code: "QA", name: "Qatar" },
  { code: "OM", name: "Oman" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "EG", name: "Egypt" },
  { code: "JO", name: "Jordan" },
  { code: "LB", name: "Lebanon" },
  { code: "TR", name: "Turkey" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "SG", name: "Singapore" },
];
