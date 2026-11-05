import { z } from "zod";

/**
 * Validation for the employer job form. Mirrors the `jobs` table constraints in migration 002
 * (title 5-150, summary 20-600, location 2-100, list sizes <= 20, pay disclosure rule, future deadline).
 * The database re-checks everything; this is for clear messages before the write.
 */
export const JOB_TYPES = ["job", "internship", "freelance"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export const EMPLOYMENTS = ["full_time", "part_time", "contract"] as const;
export const LEVELS = ["internship", "entry", "graduate", "junior"] as const;
export const PAY_PERIODS = ["month", "year", "project"] as const;

const LIST_ITEM_MAX = 200;
const LIST_MAX_ITEMS = 20;

/** Splits a textarea (one item per line) into a clean list. Returns an error message or the list. */
export function parseList(raw: string, label: string): { items: string[]; error?: string } {
  const items = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length > LIST_MAX_ITEMS) return { items: [], error: `${label}: use at most ${LIST_MAX_ITEMS} lines.` };
  const long = items.find((i) => i.length > LIST_ITEM_MAX);
  if (long) return { items: [], error: `${label}: each line must be ${LIST_ITEM_MAX} characters or fewer.` };
  return { items };
}

export const jobFormSchema = z
  .object({
    intent: z.enum(["draft", "publish"], { error: "Choose Save draft or Publish." }),
    title: z.string().trim().min(5, "Give the role a clear title (5+ characters).").max(150, "Title must be 150 characters or fewer."),
    summary: z.string().trim().min(20, "Describe the role in at least 20 characters.").max(600, "Summary must be 600 characters or fewer."),
    responsibilities: z.string().max(4000, "Responsibilities are too long."),
    requirements: z.string().max(4000, "Requirements are too long."),
    perks: z.string().max(4000, "Perks are too long."),
    type: z.enum(JOB_TYPES, { error: "Choose a valid type." }),
    workMode: z.enum(WORK_MODES, { error: "Choose a valid work mode." }),
    employment: z.enum(EMPLOYMENTS, { error: "Choose valid hours." }),
    level: z.enum(LEVELS, { error: "Choose a valid level." }),
    location: z.string().trim().min(2, "Add a location, or write “Remote”.").max(100, "Location must be 100 characters or fewer."),
    categoryId: z.string().regex(/^\d*$/, "Choose a valid category."),
    isPaid: z.boolean(),
    payMin: z.string(),
    payMax: z.string(),
    payPeriod: z.enum(["", ...PAY_PERIODS], { error: "Choose a valid pay period." }),
    deadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid date."),
  })
  .superRefine((v, ctx) => {
    for (const [key, label] of [
      ["responsibilities", "What you will do"],
      ["requirements", "What we are looking for"],
      ["perks", "What you get"],
    ] as const) {
      const r = parseList(v[key], label);
      if (r.error) ctx.addIssue({ code: "custom", path: [key], message: r.error });
    }
    if (v.isPaid) {
      const min = Number(v.payMin);
      const max = Number(v.payMax);
      if (!(min > 0) || !Number.isFinite(min)) ctx.addIssue({ code: "custom", path: ["payMin"], message: "Enter a minimum amount above zero." });
      if (!(max >= min) || !Number.isFinite(max)) ctx.addIssue({ code: "custom", path: ["payMax"], message: "Maximum must be at least the minimum." });
      if (!v.payPeriod) ctx.addIssue({ code: "custom", path: ["payPeriod"], message: "Choose how often the pay is paid." });
    }
    if (v.deadline) {
      const end = Date.parse(`${v.deadline}T23:59:59+05:30`);
      if (Number.isNaN(end) || end <= Date.now()) ctx.addIssue({ code: "custom", path: ["deadline"], message: "The deadline must be a future date." });
    }
  });

export type JobFormInput = z.input<typeof jobFormSchema>;

/** Converts a valid form into the exact column values for public.jobs. */
export function toJobColumns(v: z.output<typeof jobFormSchema>) {
  const lists = {
    responsibilities: parseList(v.responsibilities, "").items,
    requirements: parseList(v.requirements, "").items,
    perks: parseList(v.perks, "").items,
  };
  return {
    title: v.title,
    summary: v.summary,
    ...lists,
    type: v.type,
    work_mode: v.workMode,
    employment: v.employment,
    level: v.level,
    location: v.location,
    category_id: v.categoryId ? Number(v.categoryId) : null,
    is_paid: v.isPaid,
    pay_min: v.isPaid ? Number(v.payMin) : null,
    pay_max: v.isPaid ? Number(v.payMax) : null,
    pay_period: v.isPaid ? v.payPeriod : null,
    pay_currency: "INR",
    application_deadline: v.deadline ? new Date(`${v.deadline}T23:59:59+05:30`).toISOString() : null,
  };
}
