import { z } from "zod";

/** Shared by the browser (instant feedback) and the Server Actions (the real check). */

export const JOB_TYPES = ["internship", "full_time", "part_time", "freelance"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export const AVAILABILITY = ["immediately", "one_month", "three_months", "after_graduation"] as const;
export const DIGESTS = ["off", "daily", "weekly"] as const;

export const JOB_TYPE_LABEL: Record<(typeof JOB_TYPES)[number], string> = { internship: "Internship", full_time: "Full-time", part_time: "Part-time", freelance: "Freelance" };
export const WORK_MODE_LABEL: Record<(typeof WORK_MODES)[number], string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
export const AVAILABILITY_LABEL: Record<(typeof AVAILABILITY)[number], string> = {
  immediately: "Immediately",
  one_month: "Within a month",
  three_months: "Within 3 months",
  after_graduation: "After I graduate",
};
export const DIGEST_LABEL: Record<(typeof DIGESTS)[number], string> = { off: "No digest", daily: "Daily summary", weekly: "Weekly summary" };

export const accountInput = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100, "Use at most 100 characters.").refine((v) => !/[\u0000-\u001f\u007f<>]/.test(v), "Remove special characters from your name."),
  phone: z
    .string()
    .trim()
    .max(20, "Use at most 20 characters.")
    .refine((v) => v === "" || /^[0-9+()\- ]{7,20}$/.test(v), "Use 7 to 20 digits, spaces, + ( ) or -.")
    .optional(),
});
export type AccountInput = z.infer<typeof accountInput>;

export const passwordInput = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use at most 72 characters.")
      .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export const emailInput = z.object({ email: z.string().trim().toLowerCase().max(254, "That email address is too long.").pipe(z.email("Enter a valid email address.")) });

const notifications = z.object({
  applicationUpdates: z.boolean(),
  interviewReminders: z.boolean(),
  newMatches: z.boolean(),
  community: z.boolean(),
  product: z.boolean(),
  digest: z.enum(DIGESTS),
});

const studentPrefs = z.object({
  openToWork: z.boolean(),
  visibleToEmployers: z.boolean(),
  showCollege: z.boolean(),
  jobTypes: z.array(z.enum(JOB_TYPES)).max(4),
  workModes: z.array(z.enum(WORK_MODES)).max(3),
  availability: z.enum(AVAILABILITY),
});

const employerPrefs = z.object({
  autoReply: z.boolean(),
  autoReplyText: z.string().trim().max(500, "Use at most 500 characters."),
  defaultJobType: z.enum(JOB_TYPES),
  defaultWorkMode: z.enum(WORK_MODES),
  emailEachApplicant: z.boolean(),
});

export const studentSettings = z.object({ notifications, prefs: studentPrefs });
export const employerSettings = z.object({ notifications, prefs: employerPrefs });
export type StudentSettings = z.infer<typeof studentSettings>;
export type EmployerSettings = z.infer<typeof employerSettings>;

export const DEFAULT_NOTIFICATIONS: StudentSettings["notifications"] = {
  applicationUpdates: true,
  interviewReminders: true,
  newMatches: true,
  community: false,
  product: false,
  digest: "weekly",
};
export const DEFAULT_STUDENT: StudentSettings = {
  notifications: DEFAULT_NOTIFICATIONS,
  prefs: { openToWork: true, visibleToEmployers: true, showCollege: true, jobTypes: ["internship", "full_time"], workModes: ["remote", "hybrid", "onsite"], availability: "immediately" },
};
export const DEFAULT_EMPLOYER: EmployerSettings = {
  notifications: { ...DEFAULT_NOTIFICATIONS, newMatches: false, digest: "daily" },
  prefs: { autoReply: false, autoReplyText: "Thanks for applying! We have received your application and will get back to you soon.", defaultJobType: "internship", defaultWorkMode: "hybrid", emailEachApplicant: true },
};

/** Merge what is stored over the defaults; anything missing or invalid falls back to the default, so old rows never break the page. */
export function readSettings<T extends StudentSettings | EmployerSettings>(role: "student" | "employer", stored: unknown): T {
  const schema = role === "student" ? studentSettings : employerSettings;
  const defaults = (role === "student" ? DEFAULT_STUDENT : DEFAULT_EMPLOYER) as T;
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, Record<string, unknown>>;
  const merged = { notifications: { ...defaults.notifications, ...(s.notifications ?? {}) }, prefs: { ...defaults.prefs, ...(s.prefs ?? {}) } };
  const parsed = schema.safeParse(merged);
  return (parsed.success ? parsed.data : defaults) as T;
}

/** Turns the employer's saved "default opportunity type / work style" into the Post-a-role form's own field values. */
export function jobFormDefaults(prefs: EmployerSettings["prefs"]): { type: string; level: string; employment: string; workMode: string } {
  const t = prefs.defaultJobType;
  return {
    type: t === "internship" ? "internship" : t === "freelance" ? "freelance" : "job",
    level: t === "internship" ? "internship" : "entry",
    employment: t === "part_time" ? "part_time" : "full_time",
    workMode: prefs.defaultWorkMode,
  };
}
