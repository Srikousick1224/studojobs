import { z } from "zod";

/**
 * One set of rules, used twice: in the browser for instant feedback and again
 * in every Server Action (the browser can be bypassed, the server cannot).
 * "admin" is deliberately NOT an account type: nobody can register as admin.
 */
export const ACCOUNT_TYPES = ["student", "employer"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

// 72 = the most characters the password hashing algorithm (bcrypt) actually uses.
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number.");

const fullName = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(100, "Use at most 100 characters.")
  .refine((v) => !/[\u0000-\u001f\u007f<>]/.test(v), "Remove special characters from your name.");

export const registerSchema = z
  .object({
    accountType: z.enum(ACCOUNT_TYPES, "Choose Student or Employer."),
    fullName,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

/** Role choice after a first Google/GitHub sign-in. Same account types as registration: never "admin". */
export const onboardingSchema = z.object({
  accountType: z.enum(ACCOUNT_TYPES, "Choose Student or Employer."),
  fullName,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128, "Password is too long."),
  next: z.string().max(500).optional(),
});

export const emailOnlySchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

/** First error message per field: { email: "Enter a valid email address." } */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Reads a text field from FormData as a string ("" when missing or a file). */
export function text(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
