import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/dal";
import { isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { payLabel } from "./format";
import { escapeLike, type JobListItem } from "./job-view";

/**
 * Real reads for job discovery and employer job management.
 * Public reads run as anonymous/any user; RLS only returns published, unexpired jobs
 * to people who are not the owner, so drafts and rejected listings cannot leak here.
 */
export interface Result<T> {
  rows: T[];
  error: string | null;
}
const GENERIC = "We could not load these listings right now. Please refresh the page.";
const UUID = z.uuid();

function parseRows<S extends z.ZodType>(schema: S, rows: unknown): z.output<S>[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((r) => {
    const p = schema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

const money = z.union([z.number(), z.string()]).nullable();
const companyEmbed = z.object({ name: z.string(), slug: z.string(), verification_status: z.string() }).nullable();
const categoryEmbed = z.object({ id: z.number().optional(), name: z.string(), slug: z.string() }).nullable();

const publicJobRow = z.object({
  id: z.uuid(),
  title: z.string(),
  summary: z.string(),
  type: z.enum(["job", "internship", "freelance"]),
  work_mode: z.enum(["remote", "hybrid", "onsite"]),
  employment: z.enum(["full_time", "part_time", "contract"]),
  level: z.enum(["internship", "entry", "graduate", "junior"]),
  location: z.string(),
  is_paid: z.boolean(),
  pay_min: money,
  pay_max: money,
  pay_period: z.string().nullable(),
  pay_currency: z.string(),
  published_at: z.string().nullable(),
  application_deadline: z.string().nullable(),
  companies: companyEmbed,
  job_categories: categoryEmbed,
});

function toListItem(r: z.output<typeof publicJobRow>): JobListItem | null {
  if (!r.companies) return null;
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    type: r.type,
    workMode: r.work_mode,
    employment: r.employment,
    level: r.level,
    location: r.location,
    isPaid: r.is_paid,
    payText: payLabel({ ...r, is_paid: r.is_paid }),
    publishedAt: r.published_at,
    deadline: r.application_deadline,
    companyName: r.companies.name,
    companySlug: r.companies.slug,
    companyVerified: r.companies.verification_status === "approved",
    categoryName: r.job_categories?.name ?? null,
  };
}

const PUBLIC_SELECT =
  "id, title, summary, type, work_mode, employment, level, location, is_paid, pay_min, pay_max, pay_period, pay_currency, published_at, application_deadline, companies(name, slug, verification_status), job_categories(id, name, slug)";

export const PAGE_SIZE = 12;

export interface JobSearch {
  q?: string;
  type?: string;
  mode?: string;
  level?: string;
  paid?: boolean;
  location?: string;
  category?: string;
  page?: number;
}


export async function searchPublicJobs(s: JobSearch): Promise<Result<JobListItem> & { total: number }> {
  if (!isSupabaseConfigured()) return { rows: [], total: 0, error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const page = Math.max(1, Math.floor(s.page ?? 1));
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase.from("jobs").select(PUBLIC_SELECT, { count: "exact" }).eq("status", "published");
  if (s.type && (["job", "internship", "freelance"] as string[]).includes(s.type)) query = query.eq("type", s.type);
  if (s.mode && (["remote", "hybrid", "onsite"] as string[]).includes(s.mode)) query = query.eq("work_mode", s.mode);
  if (s.level && (["internship", "entry", "graduate", "junior"] as string[]).includes(s.level)) query = query.eq("level", s.level);
  if (s.paid) query = query.eq("is_paid", true);
  if (s.location?.trim()) query = query.ilike("location", `%${escapeLike(s.location.trim().slice(0, 100))}%`);
  if (s.category && /^\d+$/.test(s.category)) query = query.eq("category_id", Number(s.category));
  if (s.q?.trim()) query = query.textSearch("search", s.q.trim().slice(0, 100), { type: "websearch", config: "english" });

  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) return { rows: [], total: 0, error: GENERIC };
  const rows = parseRows(publicJobRow, data).flatMap((r) => {
    const item = toListItem(r);
    return item ? [item] : [];
  });
  return { rows, total: count ?? 0, error: null };
}

/** One published, unexpired job, or null. Also used to hide drafts from the public detail page. */
export async function getPublicJob(id: string): Promise<{ job: (JobListItem & { responsibilities: string[]; requirements: string[]; perks: string[]; categoryId: number | null }) | null; error: string | null }> {
  if (!UUID.safeParse(id).success) return { job: null, error: null };
  if (!isSupabaseConfigured()) return { job: null, error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(`${PUBLIC_SELECT}, responsibilities, requirements, perks`)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) return { job: null, error: GENERIC };
  const parsed = z
    .object({ responsibilities: z.array(z.string()), requirements: z.array(z.string()), perks: z.array(z.string()) })
    .merge(publicJobRow)
    .safeParse(data);
  if (!parsed.success) return { job: null, error: null };
  const item = toListItem(parsed.data);
  if (!item) return { job: null, error: null };
  return {
    job: {
      ...item,
      responsibilities: parsed.data.responsibilities,
      requirements: parsed.data.requirements,
      perks: parsed.data.perks,
      categoryId: parsed.data.job_categories?.id ?? null,
    },
    error: null,
  };
}

export async function listCategories(): Promise<{ id: number; name: string }[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("job_categories").select("id, name").order("name");
  return parseRows(z.object({ id: z.number(), name: z.string() }), data);
}

// ---------------------------------------------------------------------------
// Employer
// ---------------------------------------------------------------------------
const companyRow = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  size_range: z.string().nullable(),
  location: z.string().nullable(),
  about: z.string().nullable(),
  verification_status: z.enum(["pending", "approved", "rejected"]),
});
export type MyCompany = z.output<typeof companyRow>;

/** The signed-in employer's company, or null if they have not created one yet. */
export async function getMyCompany(): Promise<MyCompany | null> {
  const viewer = await getViewer();
  if (!viewer || !isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, website, industry, size_range, location, about, verification_status")
    .eq("owner_id", viewer.id)
    .maybeSingle();
  const p = companyRow.safeParse(data);
  return p.success ? p.data : null;
}

const myJobRow = z.object({
  id: z.uuid(),
  title: z.string(),
  status: z.enum(["draft", "pending_review", "published", "paused", "closed", "rejected"]),
  type: z.string(),
  location: z.string(),
  work_mode: z.string(),
  level: z.string(),
  is_paid: z.boolean(),
  application_deadline: z.string().nullable(),
  created_at: z.string(),
  moderation_note: z.string().nullable(),
});
export type MyJob = z.output<typeof myJobRow> & { applicants: number };

export async function listMyJobs(): Promise<Result<MyJob>> {
  if (!isSupabaseConfigured()) return { rows: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, status, type, location, work_mode, level, is_paid, application_deadline, created_at, moderation_note")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { rows: [], error: GENERIC };
  const jobs = parseRows(myJobRow, data);
  const ids = jobs.map((j) => j.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: apps } = await supabase.from("applications").select("job_id").in("job_id", ids);
    for (const a of parseRows(z.object({ job_id: z.uuid() }), apps)) counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1);
  }
  return { rows: jobs.map((j) => ({ ...j, applicants: counts.get(j.id) ?? 0 })), error: null };
}

/** One of the employer's own jobs for editing. RLS returns null for anyone else's job. */
export async function getMyJob(id: string) {
  if (!UUID.safeParse(id).success || !isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, summary, responsibilities, requirements, perks, type, work_mode, employment, level, location, category_id, is_paid, pay_min, pay_max, pay_period, application_deadline, status")
    .eq("id", id)
    .maybeSingle();
  const p = z
    .object({
      id: z.uuid(),
      title: z.string(),
      summary: z.string(),
      responsibilities: z.array(z.string()),
      requirements: z.array(z.string()),
      perks: z.array(z.string()),
      type: z.string(),
      work_mode: z.string(),
      employment: z.string(),
      level: z.string(),
      location: z.string(),
      category_id: z.number().nullable(),
      is_paid: z.boolean(),
      pay_min: money,
      pay_max: money,
      pay_period: z.string().nullable(),
      application_deadline: z.string().nullable(),
      status: z.string(),
    })
    .safeParse(data);
  return p.success ? p.data : null;
}

export interface ApplicationForStudent {
  id: string;
  status: string;
}

/** The student's own application to one job, if any (RLS: students only see their own). */
export async function getMyApplicationFor(jobId: string): Promise<ApplicationForStudent | null> {
  if (!UUID.safeParse(jobId).success || !isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("id, status").eq("job_id", jobId).maybeSingle();
  const p = z.object({ id: z.uuid(), status: z.string() }).safeParse(data);
  return p.success ? p.data : null;
}

export async function listMyResumes(): Promise<{ id: string; label: string; file_name: string }[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("resumes").select("id, label, file_name").order("created_at", { ascending: false });
  return parseRows(z.object({ id: z.uuid(), label: z.string(), file_name: z.string() }), data);
}

export interface MyVerificationRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  created_at: string;
}

/** The employer's own verification requests, newest first (RLS: company owner only). */
export async function listMyVerificationRequests(): Promise<MyVerificationRequest[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_verifications")
    .select("id, status, review_notes, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return parseRows(
    z.object({
      id: z.uuid(),
      status: z.enum(["pending", "approved", "rejected"]),
      review_notes: z.string().nullable(),
      created_at: z.string(),
    }),
    data,
  );
}

/** Published jobs for a list of ids (used by Saved opportunities). Order of `ids` is kept. */
export async function listPublicJobsByIds(ids: string[]): Promise<JobListItem[]> {
  const clean = ids.filter((i) => UUID.safeParse(i).success).slice(0, 100);
  if (clean.length === 0 || !isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select(PUBLIC_SELECT).in("id", clean).eq("status", "published");
  if (error) return [];
  const byId = new Map(parseRows(publicJobRow, data).flatMap((r) => { const i = toListItem(r); return i ? [[i.id, i] as const] : []; }));
  return clean.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

export interface PublicCompany {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  location: string | null;
  about: string | null;
  website: string | null;
  sizeRange: string | null;
  verified: boolean;
  openRoles: number;
}

const companyListRow = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  industry: z.string().nullable(),
  location: z.string().nullable(),
  about: z.string().nullable(),
  website: z.string().nullable(),
  size_range: z.string().nullable(),
  verification_status: z.string(),
});
const COMPANY_SELECT = "id, name, slug, industry, location, about, website, size_range, verification_status";
const toCompany = (r: z.output<typeof companyListRow>, openRoles = 0): PublicCompany => ({
  id: r.id, name: r.name, slug: r.slug, industry: r.industry, location: r.location, about: r.about, website: r.website,
  sizeRange: r.size_range, verified: r.verification_status === "approved", openRoles,
});

/** Companies anyone may see (verified, or with a public listing). `openRoles` counts published jobs only. */
export async function listPublicCompanies(): Promise<Result<PublicCompany>> {
  if (!isSupabaseConfigured()) return { rows: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select(COMPANY_SELECT).order("name").limit(200);
  if (error) return { rows: [], error: "We could not load companies right now. Please refresh the page." };
  // Open roles are counted from published jobs only (a separate, simple query; RLS already hides everything else).
  const { data: jobRows } = await supabase.from("jobs").select("company_id").eq("status", "published").limit(2000);
  const open = new Map<string, number>();
  for (const j of jobRows ?? []) open.set(String(j.company_id), (open.get(String(j.company_id)) ?? 0) + 1);
  return { rows: parseRows(companyListRow, data).map((c) => toCompany(c, open.get(c.id) ?? 0)), error: null };
}

export async function getPublicCompany(slug: string): Promise<{ company: PublicCompany | null; jobs: JobListItem[]; error: string | null }> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { company: null, jobs: [], error: null };
  if (!isSupabaseConfigured()) return { company: null, jobs: [], error: NOT_CONFIGURED_MESSAGE };
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select(COMPANY_SELECT).eq("slug", slug).maybeSingle();
  if (error) return { company: null, jobs: [], error: "We could not load this company right now." };
  const parsed = companyListRow.safeParse(data);
  if (!parsed.success) return { company: null, jobs: [], error: null };
  const { data: jobRows } = await supabase.from("jobs").select(PUBLIC_SELECT).eq("company_id", parsed.data.id).eq("status", "published").order("published_at", { ascending: false }).limit(50);
  const jobs = parseRows(publicJobRow, jobRows).flatMap((r) => { const i = toListItem(r); return i ? [i] : []; });
  return { company: toCompany(parsed.data, jobs.length), jobs, error: null };
}
