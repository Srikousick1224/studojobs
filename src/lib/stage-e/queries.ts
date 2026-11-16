import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/dal";
import { isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { isApplicationStatus } from "./schemas";
import { APPLICATION_STATUSES, type ApplicationStatus } from "./status";

/**
 * Stage E read queries. Every query runs AS THE LOGGED-IN USER, so Row Level Security
 * decides what each row may contain. Rows are parsed with zod; anything malformed is
 * dropped instead of being displayed. Nothing here is sample or placeholder data.
 */

export interface Result<T> {
  rows: T[];
  error: string | null;
}

const GENERIC_ERROR = "We could not load this information right now. Please refresh the page.";

const status = z.custom<ApplicationStatus>(isApplicationStatus);
const money = z.union([z.number(), z.string()]).nullable(); // Postgres numeric arrives as a string

function parseRows<S extends z.ZodType>(schema: S, rows: unknown): z.output<S>[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((r) => {
    const parsed = schema.safeParse(r);
    return parsed.success ? [parsed.data] : [];
  });
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------
const studentApplicationRow = z.object({
  id: z.uuid(),
  status,
  applied_at: z.string(),
  jobs: z
    .object({
      title: z.string(),
      type: z.string(),
      work_mode: z.string(),
      location: z.string(),
      is_paid: z.boolean(),
      pay_min: money,
      pay_max: money,
      pay_period: z.string().nullable(),
      pay_currency: z.string(),
      companies: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
});
export type StudentApplication = z.output<typeof studentApplicationRow>;

export async function listStudentApplications(): Promise<Result<StudentApplication>> {
  if (!isSupabaseConfigured()) return { rows: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, applied_at, jobs(title, type, work_mode, location, is_paid, pay_min, pay_max, pay_period, pay_currency, companies(name))",
    )
    .order("applied_at", { ascending: false })
    .limit(200);
  if (error) return { rows: [], error: GENERIC_ERROR };
  return { rows: parseRows(studentApplicationRow, data), error: null };
}

// ---------------------------------------------------------------------------
// Employer
// ---------------------------------------------------------------------------
const employerApplicationRow = z.object({
  id: z.uuid(),
  status,
  applied_at: z.string(),
  cover_note: z.string().nullable(),
  student_id: z.uuid(),
  jobs: z
    .object({
      id: z.uuid(),
      title: z.string(),
      companies: z.object({ name: z.string() }).nullable(),
    })
    .nullable(),
  resumes: z.object({ id: z.uuid(), label: z.string(), file_name: z.string() }).nullable(),
});

const studentCardRow = z.object({
  profile_id: z.uuid(),
  headline: z.string().nullable(),
  college: z.string().nullable(),
  degree: z.string().nullable(),
  graduation_year: z.number().nullable(),
});
const nameRow = z.object({ id: z.uuid(), full_name: z.string() });

export interface EmployerApplicant {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  coverNote: string | null;
  studentName: string;
  headline: string | null;
  college: string | null;
  degree: string | null;
  graduationYear: number | null;
  jobTitle: string;
  companyName: string;
  resumeId: string | null;
  resumeLabel: string | null;
  resumeFile: string | null;
}

export async function listEmployerApplications(limit = 200): Promise<Result<EmployerApplicant>> {
  if (!isSupabaseConfigured()) return { rows: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, applied_at, cover_note, student_id, jobs(id, title, companies(name)), resumes(id, label, file_name)",
    )
    .order("applied_at", { ascending: false })
    .limit(limit);
  if (error) return { rows: [], error: GENERIC_ERROR };

  const apps = parseRows(employerApplicationRow, data);
  const ids = [...new Set(apps.map((a) => a.student_id))];

  // RLS lets an employer read a student's name and card only after that student applied to one of their roles.
  const names = new Map<string, string>();
  const cards = new Map<string, z.output<typeof studentCardRow>>();
  if (ids.length > 0) {
    const [profiles, cardRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", ids),
      supabase
        .from("student_profiles")
        .select("profile_id, headline, college, degree, graduation_year")
        .in("profile_id", ids),
    ]);
    for (const p of parseRows(nameRow, profiles.data)) names.set(p.id, p.full_name);
    for (const c of parseRows(studentCardRow, cardRes.data)) cards.set(c.profile_id, c);
  }

  const rows: EmployerApplicant[] = apps.flatMap((a) => {
    if (!a.jobs) return [];
    const card = cards.get(a.student_id);
    return [
      {
        id: a.id,
        status: a.status,
        appliedAt: a.applied_at,
        coverNote: a.cover_note,
        studentName: names.get(a.student_id) || "Candidate",
        headline: card?.headline ?? null,
        college: card?.college ?? null,
        degree: card?.degree ?? null,
        graduationYear: card?.graduation_year ?? null,
        jobTitle: a.jobs.title,
        companyName: a.jobs.companies?.name ?? "",
        resumeId: a.resumes?.id ?? null,
        resumeLabel: a.resumes?.label ?? null,
        resumeFile: a.resumes?.file_name ?? null,
      },
    ];
  });
  return { rows, error: null };
}

export interface EmployerStats {
  openRoles: number;
  totalApplicants: number;
  shortlisted: number;
  weekly: { label: string; value: number }[];
  /** Applications grouped by status (all of this employer's roles). Same order as APPLICATION_STATUSES. */
  pipeline: { status: string; count: number }[];
  error: string | null;
}

/** Real counts for the employer's own company. Empty company = zeros, never invented numbers. */
export async function getEmployerStats(): Promise<EmployerStats> {
  if (!isSupabaseConfigured()) {
    return { openRoles: 0, totalApplicants: 0, shortlisted: 0, weekly: [], pipeline: [], error: NOT_CONFIGURED_MESSAGE };
  }
  const empty: EmployerStats = { openRoles: 0, totalApplicants: 0, shortlisted: 0, weekly: [], pipeline: [], error: null };
  const viewer = await getViewer();
  if (!viewer) return { ...empty, error: GENERIC_ERROR };
  const supabase = await createClient();

  // Open roles: only this employer's companies. Published jobs of other companies are visible to everyone under RLS.
  const { data: companies, error: companyError } = await supabase.from("companies").select("id").eq("owner_id", viewer.id);
  if (companyError) return { ...empty, error: GENERIC_ERROR };
  const companyIds = parseRows(z.object({ id: z.uuid() }), companies).map((c) => c.id);

  const since = new Date(Date.now() - 6 * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);

  const [openRes, totalRes, shortRes, weekRes, statusRes] = await Promise.all([
    companyIds.length
      ? supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published").in("company_id", companyIds)
      : Promise.resolve({ count: 0, error: null }),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "shortlisted"),
    supabase.from("applications").select("applied_at").gte("applied_at", since.toISOString()),
    supabase.from("applications").select("status").limit(5000),
  ]);
  if (openRes.error || totalRes.error || shortRes.error || weekRes.error || statusRes.error) return { ...empty, error: GENERIC_ERROR };

  const counts = new Map<string, number>();
  for (const r of parseRows(z.object({ applied_at: z.string() }), weekRes.data)) {
    const key = r.applied_at.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const statusCounts = new Map<string, number>();
  for (const r of parseRows(z.object({ status: z.string() }), statusRes.data)) statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86_400_000);
    return {
      label: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
      value: counts.get(d.toISOString().slice(0, 10)) ?? 0,
    };
  });

  return {
    openRoles: openRes.count ?? 0,
    totalApplicants: totalRes.count ?? 0,
    shortlisted: shortRes.count ?? 0,
    weekly,
    pipeline: APPLICATION_STATUSES.map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Admin (RLS grants admins read access to these tables; the page also checks the role)
// ---------------------------------------------------------------------------
const verificationRow = z.object({
  id: z.uuid(),
  business_email: z.string(),
  registration_number: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  companies: z.object({ name: z.string(), slug: z.string(), location: z.string().nullable() }).nullable(),
});
export type PendingVerification = z.output<typeof verificationRow>;

const pendingJobRow = z.object({
  id: z.uuid(),
  title: z.string(),
  type: z.string(),
  location: z.string(),
  created_at: z.string(),
  /** Present only after migration 009 (job moderation hardening). The reviewer sends it back so a listing edited meanwhile is not approved unseen. */
  content_version: z.number().int().optional(),
  companies: z.object({ name: z.string() }).nullable(),
});
export type PendingJob = z.output<typeof pendingJobRow>;

const reportRow = z.object({
  id: z.uuid(),
  reason: z.string(),
  details: z.string(),
  status: z.string(),
  created_at: z.string(),
  jobs: z.object({ title: z.string() }).nullable(),
  companies: z.object({ name: z.string() }).nullable(),
});
export type OpenReport = z.output<typeof reportRow>;

export async function listPendingVerifications(): Promise<Result<PendingVerification>> {
  if (!isSupabaseConfigured()) return { rows: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_verifications")
    .select("id, business_email, registration_number, notes, created_at, companies(name, slug, location)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return { rows: [], error: GENERIC_ERROR };
  return { rows: parseRows(verificationRow, data), error: null };
}

export async function listListingsAwaitingReview(): Promise<Result<PendingJob>> {
  if (!isSupabaseConfigured()) return { rows: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const build = (columns: string) =>
    supabase.from("jobs").select(columns).eq("status", "pending_review").order("created_at", { ascending: true }).limit(100);
  let { data, error } = await build("id, title, type, location, created_at, content_version, companies(name)");
  // Before migration 009 the column does not exist (Postgres 42703 / PostgREST says so): ask again without it.
  if (error && (error.code === "42703" || /content_version/i.test(error.message))) {
    ({ data, error } = await build("id, title, type, location, created_at, companies(name)"));
  }
  if (error) return { rows: [], error: GENERIC_ERROR };
  return { rows: parseRows(pendingJobRow, data), error: null };
}

export async function listOpenReports(): Promise<Result<OpenReport>> {
  if (!isSupabaseConfigured()) return { rows: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, reason, details, status, created_at, jobs(title), companies(name)")
    .in("status", ["open", "investigating"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return { rows: [], error: GENERIC_ERROR };
  return { rows: parseRows(reportRow, data), error: null };
}
