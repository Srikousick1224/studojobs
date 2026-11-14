"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/stage-e/result";

const input = z.object({ jobId: z.uuid(), save: z.boolean() });

/** Save or un-save a job for the signed-in student. Identity comes from the session; RLS also checks the job is public. */
export async function setSavedJobAction(payload: unknown): Promise<ActionResult> {
  const parsed = input.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "That listing could not be found." };
  const viewer = await getViewer();
  if (!viewer || viewer.isSuspended || !viewer.onboarded) return { ok: false, message: "Please sign in to save opportunities." };
  if (viewer.role !== "student") return { ok: false, message: "Only student accounts can save opportunities." };
  const supabase = await createClient();
  const { jobId, save } = parsed.data;
  const { error } = save
    ? await supabase.from("saved_jobs").upsert({ student_id: viewer.id, job_id: jobId }, { onConflict: "student_id,job_id", ignoreDuplicates: true })
    : await supabase.from("saved_jobs").delete().eq("student_id", viewer.id).eq("job_id", jobId);
  if (error) return { ok: false, message: save ? "This listing can no longer be saved." : "Could not remove it. Please try again." };
  revalidatePath("/student/saved");
  revalidatePath("/student");
  return { ok: true, message: save ? "Saved." : "Removed from saved." };
}
