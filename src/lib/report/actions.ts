"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/stage-e/result";
import { listingReportInput } from "./schema";

/** Report a published listing. The reporter is the signed-in user (the database guard enforces it again); one report per person per listing. */
export async function reportListingAction(payload: unknown): Promise<ActionResult> {
  const parsed = listingReportInput.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  const viewer = await getViewer();
  if (!viewer || viewer.isSuspended || !viewer.onboarded) return { ok: false, message: "Please sign in to send a report." };
  const supabase = await createClient();
  const { jobId, reason, details } = parsed.data;
  const { data: job } = await supabase.from("jobs").select("id, company_id").eq("id", jobId).maybeSingle();
  if (!job) return { ok: false, message: "That listing could not be found." };
  const { error } = await supabase.from("reports").insert({ reporter_id: viewer.id, job_id: job.id, company_id: job.company_id, reason, details });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "You have already reported this listing. Our team will review it." };
    if (error.code === "P0001") return { ok: false, message: error.message };
    return { ok: false, message: "We could not send your report. Please try again." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  return { ok: true, message: "Thank you. Your report was sent to our review team." };
}
