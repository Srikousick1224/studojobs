import "server-only";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { listPublicJobsByIds } from "@/lib/stage-e/job-queries";
import type { JobListItem } from "@/lib/stage-e/job-view";

/** How the Save button should behave for the person looking at the page. */
export type SaveMode = "student" | "guest" | "hidden";
export interface SaveState {
  mode: SaveMode;
  saved: ReadonlySet<string>;
}

/** One query for a whole page of cards. Only students can save; visitors are sent to sign in; employers/admins see no button. */
export async function getSaveState(jobIds: string[]): Promise<SaveState> {
  if (!isSupabaseConfigured()) return { mode: "guest", saved: new Set() };
  const viewer = await getViewer();
  if (!viewer) return { mode: "guest", saved: new Set() };
  if (viewer.role !== "student") return { mode: "hidden", saved: new Set() };
  if (jobIds.length === 0) return { mode: "student", saved: new Set() };
  const supabase = await createClient();
  const { data } = await supabase.from("saved_jobs").select("job_id").eq("student_id", viewer.id).in("job_id", jobIds);
  return { mode: "student", saved: new Set((data ?? []).map((r) => String(r.job_id))) };
}

/** The signed-in student's saved jobs that are still published, newest save first. */
export async function listSavedJobs(): Promise<{ jobs: JobListItem[]; total: number }> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "student") return { jobs: [], total: 0 };
  const supabase = await createClient();
  const { data } = await supabase.from("saved_jobs").select("job_id").eq("student_id", viewer.id).order("created_at", { ascending: false }).limit(100);
  const ids = (data ?? []).map((r) => String(r.job_id));
  const jobs = await listPublicJobsByIds(ids);
  return { jobs, total: ids.length };
}

export async function countSavedJobs(): Promise<number> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "student") return 0;
  const supabase = await createClient();
  const { count } = await supabase.from("saved_jobs").select("job_id", { count: "exact", head: true }).eq("student_id", viewer.id);
  return count ?? 0;
}
