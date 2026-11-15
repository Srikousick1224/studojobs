"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/stage-e/result";
import { accountInput, emailInput, employerSettings, passwordInput, studentSettings } from "./schema";

const fail = (message: string): ActionResult => ({ ok: false, message });

async function me() {
  const viewer = await getViewer();
  return viewer && !viewer.isSuspended && viewer.onboarded ? viewer : null;
}

/** Name and phone. The role, email and suspension flag are never touched here. */
export async function updateAccountAction(payload: unknown): Promise<ActionResult> {
  const parsed = accountInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const viewer = await me();
  if (!viewer) return fail("Please sign in again.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone ? parsed.data.phone : null })
    .eq("id", viewer.id);
  if (error) return fail("We could not save your details. Please try again.");
  revalidatePath("/", "layout");
  return { ok: true, message: "Account details saved." };
}

/** Changes the password of the signed-in user (Supabase checks the session). */
export async function changePasswordAction(payload: unknown): Promise<ActionResult> {
  const parsed = passwordInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  if (!(await me())) return fail("Please sign in again.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(/same|different/i.test(error.message) ? "Choose a password you have not used before." : "We could not change your password. Please try again.");
  return { ok: true, message: "Password changed." };
}

/** Starts an email change. Supabase sends a confirmation link; nothing changes until it is clicked. */
export async function changeEmailAction(payload: unknown): Promise<ActionResult> {
  const parsed = emailInput.safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
  const viewer = await me();
  if (!viewer) return fail("Please sign in again.");
  if (parsed.data.email === viewer.email.toLowerCase()) return fail("That is already your email address.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) return fail("We could not start the email change. Please try again.");
  return { ok: true, message: "Check your inbox: we sent a confirmation link. Your email changes after you click it." };
}

/** Signs out every device, including this one. The caller then sends the person to the login page. */
export async function signOutEverywhereAction(): Promise<ActionResult> {
  if (!(await me())) return fail("Please sign in again.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return fail("We could not sign you out everywhere. Please try again.");
  return { ok: true, message: "Signed out on all devices." };
}

/** Saves notification + role preferences into the person's own row. Role comes from the session, never the form. */
export async function savePreferencesAction(payload: unknown): Promise<ActionResult> {
  const viewer = await me();
  if (!viewer) return fail("Please sign in again.");
  if (viewer.role !== "student" && viewer.role !== "employer") return fail("This page is for student and employer accounts.");
  const parsed = (viewer.role === "student" ? studentSettings : employerSettings).safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").upsert({ user_id: viewer.id, data: parsed.data }, { onConflict: "user_id" });
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205";
    return fail(missing ? "Preferences are not switched on yet (the settings migration has not been applied)." : "We could not save your preferences. Please try again.");
  }
  revalidatePath(`/${viewer.role}/settings`);
  return { ok: true, message: "Preferences saved." };
}
