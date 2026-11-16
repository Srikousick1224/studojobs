"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/dal";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { interviewInput } from "./interview-schema";
import type { ActionResult } from "./result";

const fail = (message: string): ActionResult => ({ ok: false, message });
const empty = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

/**
 * Employer schedules an interview for one of THEIR applicants. Runs as the employer: RLS (owns_application_job)
 * and the interviews_guard trigger decide. The trigger also moves the application to "interview scheduled"
 * and notifies the student.
 */
export async function scheduleInterviewAction(payload: unknown): Promise<ActionResult> {
  const viewer = await requireRole("employer");
  const parsed = interviewInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the interview details.");
  const limited = rateLimit(`interview:${viewer.id}`, 30, 60 * 60 * 1000);
  if (!limited.ok) return fail(tooManyMessage(limited));
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("interviews").insert({
    application_id: d.applicationId,
    scheduled_by: viewer.id,
    scheduled_at: d.scheduledAt,
    duration_minutes: d.durationMinutes,
    mode: d.mode,
    meeting_link: d.mode === "onsite" ? null : empty(d.meetingLink),
    location: d.mode === "onsite" ? empty(d.location) : null,
    notes: empty(d.notes),
  });
  if (error) {
    // The guard's own messages are written for people (e.g. "This application can no longer be scheduled").
    if (error.code === "P0001" || error.code === "23514") return fail(error.message);
    return fail("We could not schedule that interview. Please try again.");
  }
  revalidatePath("/employer/applicants");
  revalidatePath("/student/applications");
  return { ok: true, message: "Interview scheduled. The student has been notified." };
}

/** Marks an interview as cancelled (only the employer who owns the job can; RLS enforces it). */
export async function cancelInterviewAction(payload: unknown): Promise<ActionResult> {
  await requireRole("employer");
  const parsed = z.object({ interviewId: z.uuid() }).safeParse(payload);
  if (!parsed.success) return fail("Invalid interview.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("interviews").update({ status: "cancelled" }).eq("id", parsed.data.interviewId).eq("status", "scheduled").select("id");
  if (error || !data?.length) return fail("We could not cancel that interview.");
  revalidatePath("/employer/applicants");
  revalidatePath("/student/applications");
  return { ok: true, message: "Interview cancelled." };
}
