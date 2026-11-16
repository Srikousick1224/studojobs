import "server-only";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { MyProfile } from "./profile-schema";

/** The signed-in student's editable profile, from real rows (RLS: own rows only). */
export async function getMyProfile(): Promise<MyProfile | null> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "student") return null;
  const supabase = await createClient();
  const [{ data: sp }, { data: ss }, { data: all }, { data: rs }] = await Promise.all([
    supabase.from("student_profiles").select("headline, bio, college, degree, graduation_year, location").eq("profile_id", viewer.id).maybeSingle(),
    supabase.from("student_skills").select("skills(name)").eq("student_id", viewer.id).limit(50),
    supabase.from("skills").select("name").order("name").limit(80),
    supabase.from("resumes").select("id, label, file_name, is_default, size_bytes, created_at").eq("student_id", viewer.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const skills = (ss ?? []).flatMap((r) => {
    const rel = r.skills as unknown as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return name ? [name] : [];
  });
  const have = new Set(skills.map((s) => s.toLowerCase()));
  return {
    fullName: viewer.fullName,
    headline: sp?.headline ?? "",
    bio: sp?.bio ?? "",
    college: sp?.college ?? "",
    degree: sp?.degree ?? "",
    graduationYear: sp?.graduation_year ?? null,
    location: sp?.location ?? "",
    skills,
    suggestions: (all ?? []).map((s) => String(s.name)).filter((n) => !have.has(n.toLowerCase())).slice(0, 14),
    resumes: (rs ?? []).map((r) => ({ id: String(r.id), label: String(r.label), fileName: String(r.file_name), isDefault: Boolean(r.is_default), sizeBytes: Number(r.size_bytes), createdAt: String(r.created_at) })),
  };
}
