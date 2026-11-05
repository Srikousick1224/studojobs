import { z } from "zod";

/**
 * Company verification request. Mirrors company_verifications constraints in migration 002
 * (business_email format, registration_number <= 60, notes <= 1000). The database re-checks everything.
 * Document upload (verification-docs bucket) is not built yet.
 */
export const verificationFormSchema = z.object({
  businessEmail: z
    .string()
    .trim()
    .max(254, "Business email must be 254 characters or fewer.")
    .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid business email address (for example you@yourcompany.com)."),
  registrationNumber: z.string().trim().max(60, "Registration number must be 60 characters or fewer.").optional(),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer.").optional(),
});
