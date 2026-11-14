"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/stage-e/result";
import { profileInput } from "./profile-schema";

const fail = (message: string): ActionResult => ({ ok: false, message });
const likeSafe = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Saves the student's profile and skills. Everything runs as the student, so RLS limits it to their own rows. */
export async function saveProfileAction(payload: unknown): Promise<ActionResult> {
  const parsed = profileInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const viewer = await getViewer();
  if (!viewer || viewer.isSuspended || !viewer.onboarded) return fail("Please sign in to save your profile.");
  if (viewer.role !== "student") return fail("Only student accounts have this profile.");
  const p = parsed.data;
  const supabase = await createClient();

  const { error: nameErr } = await supabase.from("profiles").update({ full_name: p.fullName }).eq("id", viewer.id);
  if (nameErr) return fail("We could not save your name. Please try again.");

  const { error: profErr } = await supabase.from("student_profiles").upsert(
    {
      profile_id: viewer.id,
      headline: p.headline ?? null,
      bio: p.bio ?? null,
      college: p.college,
      degree: p.degree ?? null,
      graduation_year: p.graduationYear ?? null,
      location: p.location ?? null,
    },
    { onConflict: "profile_id" },
  );
  if (profErr) return fail("We could not save your profile. Please try again.");

  // Skills: find each by name (case-insensitive), create the missing ones, then make the student's list match exactly.
  const wanted = p.skills;
  const ids: number[] = [];
  for (const name of wanted) {
    const find = () => supabase.from("skills").select("id").ilike("name", likeSafe(name)).limit(1).maybeSingle();
    let { data } = await find();
    if (!data) {
      const ins = await supabase.from("skills").insert({ name }).select("id").single();
      data = ins.data ?? (await find()).data; // a race with another student creating the same skill is fine
    }
    if (!data) return fail("We could not save one of your skills. Please try again.");
    ids.push(Number(data.id));
  }
  const { data: current } = await supabase.from("student_skills").select("skill_id").eq("student_id", viewer.id);
  const have = new Set((current ?? []).map((r) => Number(r.skill_id)));
  const add = ids.filter((id) => !have.has(id));
  const remove = [...have].filter((id) => !ids.includes(id));
  if (add.length) {
    const { error } = await supabase.from("student_skills").insert(add.map((skill_id) => ({ student_id: viewer.id, skill_id })));
    if (error) return fail("We could not save your skills. Please try again.");
  }
  if (remove.length) {
    const { error } = await supabase.from("student_skills").delete().eq("student_id", viewer.id).in("skill_id", remove);
    if (error) return fail("We could not update your skills. Please try again.");
  }

  revalidatePath("/student");
  revalidatePath("/student/profile");
  return { ok: true, message: "Profile saved." };
}
