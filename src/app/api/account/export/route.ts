import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";
import { exportFileName, section, shapeExport, type Section } from "@/lib/account/export-shape";

/**
 * GET /api/account/export — a JSON copy of the signed-in person's own data.
 *
 * Every query runs as the user (no service role), so row-level security decides what comes back. Employers get their
 * company and listings but never candidates' applications. Nothing is cached.
 */
export async function GET(request: NextRequest) {
  const noStore = { "Cache-Control": "no-store" };
  // A page on another website must not be able to start this download for a signed-in visitor.
  if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: noStore });

  const viewer = await getViewer();
  if (!viewer || viewer.isSuspended || !viewer.onboarded || (viewer.role !== "student" && viewer.role !== "employer")) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: noStore });
  }
  const limit = rateLimit(`export:${viewer.id}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooManyMessage(limit) }, { status: 429, headers: { ...noStore, "Retry-After": String(limit.retryAfterSec) } });

  const supabase = await createClient();
  const uid = viewer.id;
  const sections: Record<string, Section> = {};

  if (viewer.role === "student") {
    const [profile, student, skills, resumes, apps, saved, notes, reports, settings] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid),
      supabase.from("student_profiles").select("*").eq("profile_id", uid),
      supabase.from("student_skills").select("*, skills(name)").eq("student_id", uid),
      supabase.from("resumes").select("*").eq("student_id", uid),
      supabase.from("applications").select("*").eq("student_id", uid),
      supabase.from("saved_jobs").select("*").eq("student_id", uid),
      supabase.from("notifications").select("*").eq("user_id", uid),
      supabase.from("reports").select("id, job_id, company_id, reason, details, status, created_at").eq("reporter_id", uid),
      supabase.from("user_settings").select("*").eq("user_id", uid),
    ]);
    // Interviews hang off applications (they have no student column), so look them up by this student's own application ids.
    const appIds = (apps.data ?? []).map((a) => a.id);
    const interviews = appIds.length ? await supabase.from("interviews").select("*").in("application_id", appIds) : { data: [], error: null };
    Object.assign(sections, {
      profile: section(profile), student_profile: section(student), skills: section(skills), resumes: section(resumes),
      applications: section(apps), saved_jobs: section(saved), interviews: section(interviews),
      notifications: section(notes), reports_you_sent: section(reports), settings: section(settings),
    });
  } else {
    const [profile, employer, notes, reports, settings] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid),
      supabase.from("employer_profiles").select("*").eq("profile_id", uid),
      supabase.from("notifications").select("*").eq("user_id", uid),
      supabase.from("reports").select("id, job_id, company_id, reason, details, status, created_at").eq("reporter_id", uid),
      supabase.from("user_settings").select("*").eq("user_id", uid),
    ]);
    const companyId = (employer.data?.[0] as { company_id?: string } | undefined)?.company_id;
    const [company, jobs] = companyId
      ? await Promise.all([supabase.from("companies").select("*").eq("id", companyId), supabase.from("jobs").select("*").eq("company_id", companyId)])
      : [{ data: [], error: null }, { data: [], error: null }];
    Object.assign(sections, {
      profile: section(profile), employer_profile: section(employer), company: section(company), listings: section(jobs),
      notifications: section(notes), reports_you_sent: section(reports), settings: section(settings),
    });
  }

  const now = new Date();
  const body = shapeExport({ role: viewer.role, generatedAt: now, account: { id: viewer.id, email: viewer.email }, sections });
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      ...noStore,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(viewer.role, now)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
