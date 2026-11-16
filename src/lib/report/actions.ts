"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/stage-e/result";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";
import { companyReportInput, listingReportInput } from "./schema";

/** Report a published listing. The reporter is the signed-in user (the database guard enforces it again); one report per person per listing. */
export async function reportListingAction(payload: unknown): Promise<ActionResult> {
  const parsed = listingReportInput.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  const viewer = await getViewer();
  if (!viewer || viewer.isSuspended || !viewer.onboarded) return { ok: false, message: "Please sign in to send a report." };
  const limit = rateLimit(`report:${viewer.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: tooManyMessage(limit) };
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

/** Report a company as a whole. The database already allows a company-only report (job_id may be null); we stop an exact repeat here because the unique rule ignores empty job ids. */
export async function reportCompanyAction(payload: unknown): Promise<ActionResult> {
  const parsed = companyReportInput.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form." };
  const viewer = await getViewer();
  if (!viewer || viewer.isSuspended || !viewer.onboarded) return { ok: false, message: "Please sign in to send a report." };
  const limit = rateLimit(`report:${viewer.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: tooManyMessage(limit) };
  const supabase = await createClient();
  const { companyId, reason, details } = parsed.data;
  const { data: company } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (!company) return { ok: false, message: "That company could not be found." };
  const { data: existing } = await supabase.from("reports").select("id").eq("reporter_id", viewer.id).eq("company_id", company.id).is("job_id", null).eq("status", "open").limit(1);
  if (existing && existing.length > 0) return { ok: false, message: "You have already reported this company. Our team will review it." };
  const { error } = await supabase.from("reports").insert({ reporter_id: viewer.id, job_id: null, company_id: company.id, reason, details });
  if (error) {
    if (error.code === "P0001") return { ok: false, message: error.message };
    return { ok: false, message: "We could not send your report. Please try again." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  return { ok: true, message: "Thank you. Your report was sent to our review team." };
}
