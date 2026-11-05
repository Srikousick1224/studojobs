"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { applicationIdInput, employerStatusInput, moderationDecisionInput, reportDecisionInput, verificationDecisionInput, isApplicationStatus } from "./schemas";
import { canStudentWithdraw } from "./status";
import type { ActionResult } from "./result";

/**
 * Server actions for Stage E. Each one:
 *  1. checks the caller's ROLE on the server (requireRole reads profiles.role from the database),
 *  2. validates its input with zod,
 *  3. runs the write AS THE USER, so RLS and the database guard triggers have the final say.
 * Nothing trusts the browser, a form field's role, or a hidden input.
 */

const fail = (message: string): ActionResult => ({ ok: false, message });

export async function withdrawApplicationAction(payload: unknown): Promise<ActionResult> {
  const viewer = await requireRole("student");
  const parsed = applicationIdInput.safeParse(payload);
  if (!parsed.success) return fail("That application could not be found.");
  const { applicationId } = parsed.data;

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("applications")
    .select("status")
    .eq("id", applicationId)
    .eq("student_id", viewer.id)
    .maybeSingle();
  if (readError || !current || !isApplicationStatus(current.status)) return fail("That application could not be found.");
  if (!canStudentWithdraw(current.status)) return fail("This application can no longer be withdrawn.");

  const { data, error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("student_id", viewer.id)
    .select("id");
  if (error || !data || data.length === 0) return fail("We could not withdraw this application. Please try again.");

  revalidatePath("/student/applications");
  return { ok: true, message: "Application withdrawn." };
}

export async function employerSetApplicationStatusAction(payload: unknown): Promise<ActionResult> {
  await requireRole("employer");
  const parsed = employerStatusInput.safeParse(payload);
  if (!parsed.success) return fail("Choose a valid status.");
  const { applicationId, status } = parsed.data;

  const supabase = await createClient();
  // RLS only lets the owner of the job update this row, and the guard trigger blocks invalid transitions.
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select("id");
  if (error) return fail("That status change is not allowed for this application.");
  if (!data || data.length === 0) return fail("That application is not one of your applicants.");

  revalidatePath("/employer/applicants");
  revalidatePath("/employer");
  return { ok: true, message: "Status updated." };
}

export async function adminDecideVerificationAction(payload: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = verificationDecisionInput.safeParse(payload);
  if (!parsed.success) return fail("Invalid decision.");
  const { verificationId, decision } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_verifications")
    .update({ status: decision })
    .eq("id", verificationId)
    .eq("status", "pending")
    .select("id");
  if (error) return fail("The decision could not be saved.");
  if (!data || data.length === 0) return fail("This request has already been reviewed.");

  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
  return { ok: true, message: decision === "approved" ? "Company approved." : "Company rejected." };
}

export async function adminModerateListingAction(payload: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = moderationDecisionInput.safeParse(payload);
  if (!parsed.success) return fail("Invalid decision.");
  const { jobId, decision } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: decision })
    .eq("id", jobId)
    .eq("status", "pending_review")
    .select("id");
  if (error) return fail("The decision could not be saved.");
  if (!data || data.length === 0) return fail("This listing is no longer waiting for review.");

  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
  return { ok: true, message: decision === "published" ? "Listing published." : "Listing rejected." };
}

export async function adminResolveReportAction(payload: unknown): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = reportDecisionInput.safeParse(payload);
  if (!parsed.success) return fail("Invalid decision.");
  const { reportId, decision } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .update({ status: decision })
    .eq("id", reportId)
    .in("status", ["open", "investigating"])
    .select("id");
  if (error) return fail("The decision could not be saved.");
  if (!data || data.length === 0) return fail("This report has already been closed.");

  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
  return { ok: true, message: decision === "resolved" ? "Report resolved." : "Report dismissed." };
}
