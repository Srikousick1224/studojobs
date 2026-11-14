import "server-only";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { listPublicJobsByIds, searchPublicJobs } from "@/lib/stage-e/job-queries";
import type { JobListItem } from "@/lib/stage-e/job-view";

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}
export interface StudentOverview {
  applications: number;
  interviews: number;
  saved: number;
  skills: string[];
  recommended: JobListItem[];
  /** "skills" = matched on the student's skills; "latest" = no skills yet, so newest listings */
  recommendedBy: "skills" | "latest";
  checklist: ChecklistItem[];
}

/** Everything the student dashboard shows, from real rows only (RLS limits each query to this student). */
export async function getStudentOverview(): Promise<StudentOverview | null> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "student") return null;
  const supabase = await createClient();

  const [apps, interviews, saved, profile, skillRows, resumes] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("student_id", viewer.id),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("student_id", viewer.id).eq("status", "interview_scheduled"),
    supabase.from("saved_jobs").select("job_id", { count: "exact", head: true }).eq("student_id", viewer.id),
    supabase.from("student_profiles").select("headline, college, degree, graduation_year").eq("profile_id", viewer.id).maybeSingle(),
    supabase.from("student_skills").select("skill_id, skills(name)").eq("student_id", viewer.id).limit(50),
    supabase.from("resumes").select("id", { count: "exact", head: true }).eq("student_id", viewer.id),
  ]);

  const skillIds: number[] = [];
  const skills: string[] = [];
  for (const r of skillRows.data ?? []) {
    skillIds.push(Number(r.skill_id));
    const rel = r.skills as unknown as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    if (name) skills.push(name);
  }

  let recommended: JobListItem[] = [];
  let recommendedBy: StudentOverview["recommendedBy"] = "latest";
  if (skillIds.length > 0) {
    const { data } = await supabase.from("job_skills").select("job_id").in("skill_id", skillIds).limit(500);
    const score = new Map<string, number>();
    for (const r of data ?? []) score.set(String(r.job_id), (score.get(String(r.job_id)) ?? 0) + 1);
    const top = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
    recommended = (await listPublicJobsByIds(top)).slice(0, 4);
    if (recommended.length > 0) recommendedBy = "skills";
  }
  if (recommended.length === 0) recommended = (await searchPublicJobs({ page: 1 })).rows.slice(0, 4);

  const p = profile.data;
  const checklist: ChecklistItem[] = [
    { key: "account", label: "Create your account", done: true },
    { key: "education", label: "Add your education", done: !!(p?.college && p?.degree) },
    { key: "skills", label: "Add at least 5 skills", done: skillIds.length >= 5 },
    { key: "resume", label: "Upload your resume", done: (resumes.count ?? 0) > 0 },
  ];

  return { applications: apps.count ?? 0, interviews: interviews.count ?? 0, saved: saved.count ?? 0, skills, recommended, recommendedBy, checklist };
}
