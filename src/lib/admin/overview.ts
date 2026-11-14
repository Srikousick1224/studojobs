import "server-only";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export interface AdminOverview {
  students: number;
  employers: number;
  publishedListings: number;
  listingsAwaitingReview: number;
  companiesAwaitingVerification: number;
  openReports: number;
  /** Applications created in each of the last 8 weeks, oldest first. */
  weekly: { label: string; value: number }[];
}

/** Real platform numbers for admins (RLS lets only admins read across users). One cheap count query each, run in parallel. */
export async function getAdminOverview(): Promise<AdminOverview> {
  await requireRole("admin");
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - (7 - i) * 7 * 86_400_000 + 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), label: new Date(start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) };
  });
  const [students, employers, published, review, pendingCompanies, reports, ...weekly] = await Promise.all([
    supabase.from("profiles").select("id", head).eq("role", "student"),
    supabase.from("profiles").select("id", head).eq("role", "employer"),
    supabase.from("jobs").select("id", head).eq("status", "published"),
    supabase.from("jobs").select("id", head).eq("status", "pending_review"),
    supabase.from("companies").select("id", head).eq("verification_status", "pending"),
    supabase.from("reports").select("id", head).in("status", ["open", "investigating"]),
    ...weeks.map((w) => supabase.from("applications").select("id", head).gte("applied_at", w.start).lt("applied_at", w.end)),
  ]);
  return {
    students: students.count ?? 0,
    employers: employers.count ?? 0,
    publishedListings: published.count ?? 0,
    listingsAwaitingReview: review.count ?? 0,
    companiesAwaitingVerification: pendingCompanies.count ?? 0,
    openReports: reports.count ?? 0,
    weekly: weeks.map((w, i) => ({ label: w.label, value: weekly[i]?.count ?? 0 })),
  };
}
