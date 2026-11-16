"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ResumeLinkResult } from "@/lib/stage-e/result";
import { checkResumeFile, cleanFileName, cleanLabel, MAX_RESUMES } from "./resume-file";

const fail = (message: string): ActionResult => ({ ok: false, message });
const id = z.object({ id: z.uuid() });

/**
 * Upload a resume. The file goes to the PRIVATE "resumes" bucket under <student-id>/<random>.<ext>;
 * Storage RLS only lets a student write into their own folder. A random name means the original file
 * name can never be used to guess a path.
 */
export async function uploadResumeAction(formData: FormData): Promise<ActionResult> {
  const viewer = await requireRole("student");
  const limited = rateLimit(`resume-upload:${viewer.id}`, 10, 60 * 60 * 1000);
  if (!limited.ok) return fail(tooManyMessage(limited));

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF or Word file to upload.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkResumeFile({ name: file.name, size: file.size, head: bytes.subarray(0, 8) });
  if (!check.ok) return fail(check.message);

  const supabase = await createClient();
  const { count } = await supabase.from("resumes").select("id", { count: "exact", head: true }).eq("student_id", viewer.id);
  if ((count ?? 0) >= MAX_RESUMES) return fail(`You can keep up to ${MAX_RESUMES} resumes. Delete one first.`);

  const path = `${viewer.id}/${crypto.randomUUID()}.${check.ext}`;
  const { error: upErr } = await supabase.storage.from("resumes").upload(path, bytes, { contentType: check.mime, upsert: false });
  if (upErr) return fail("We could not upload your resume. Please try again.");

  const { error: rowErr } = await supabase.from("resumes").insert({
    student_id: viewer.id,
    label: cleanLabel(String(formData.get("label") ?? ""), file.name),
    storage_path: path,
    file_name: cleanFileName(file.name),
    mime_type: check.mime,
    size_bytes: file.size,
  });
  if (rowErr) {
    await supabase.storage.from("resumes").remove([path]); // do not leave an orphan file behind
    return fail("We could not save your resume. Please try again.");
  }
  revalidatePath("/student/profile");
  return { ok: true, message: "Resume uploaded." };
}

/** Delete a resume (row first, then the file). Applications that used it keep working; they just lose the attachment. */
export async function deleteResumeAction(payload: unknown): Promise<ActionResult> {
  const viewer = await requireRole("student");
  const parsed = id.safeParse(payload);
  if (!parsed.success) return fail("Invalid resume.");
  const supabase = await createClient();
  const { data: row } = await supabase.from("resumes").select("storage_path, is_default").eq("id", parsed.data.id).eq("student_id", viewer.id).maybeSingle();
  if (!row) return fail("That resume was not found.");
  const { error } = await supabase.from("resumes").delete().eq("id", parsed.data.id).eq("student_id", viewer.id);
  if (error) return fail("We could not delete that resume. Please try again.");
  await supabase.storage.from("resumes").remove([row.storage_path]);
  if (row.is_default) {
    const { data: next } = await supabase.from("resumes").select("id").eq("student_id", viewer.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (next) await supabase.from("resumes").update({ is_default: true }).eq("id", next.id).eq("student_id", viewer.id);
  }
  revalidatePath("/student/profile");
  return { ok: true, message: "Resume deleted." };
}

/** The database guard turns every other resume off when one becomes the default. */
export async function setDefaultResumeAction(payload: unknown): Promise<ActionResult> {
  const viewer = await requireRole("student");
  const parsed = id.safeParse(payload);
  if (!parsed.success) return fail("Invalid resume.");
  const supabase = await createClient();
  const { error } = await supabase.from("resumes").update({ is_default: true }).eq("id", parsed.data.id).eq("student_id", viewer.id);
  if (error) return fail("We could not change your default resume.");
  revalidatePath("/student/profile");
  return { ok: true, message: "Default resume updated." };
}

/** A 5-minute link so the student can check their own file. */
export async function getMyResumeLinkAction(payload: unknown): Promise<ResumeLinkResult> {
  const viewer = await requireRole("student");
  const parsed = id.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Invalid resume." };
  const supabase = await createClient();
  const { data: row } = await supabase.from("resumes").select("storage_path").eq("id", parsed.data.id).eq("student_id", viewer.id).maybeSingle();
  if (!row) return { ok: false, message: "That resume was not found." };
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(row.storage_path, 300);
  if (error || !data?.signedUrl) return { ok: false, message: "The resume could not be opened. Please try again." };
  return { ok: true, url: data.signedUrl };
}
