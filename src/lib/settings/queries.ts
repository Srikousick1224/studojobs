import "server-only";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { readSettings, type EmployerSettings, type StudentSettings } from "./schema";

export interface SettingsPageData<S> {
  fullName: string;
  email: string;
  phone: string;
  /** "email" accounts can change their password here; Google sign-ins cannot (they have none). */
  usesPassword: boolean;
  settings: S;
  /** false until migration 012 is applied: preferences show a clear notice instead of failing */
  preferencesReady: boolean;
}

/** Everything the Settings page needs. Runs as the signed-in user, so RLS limits it to their own rows. */
export async function getSettingsData<R extends "student" | "employer">(role: R): Promise<SettingsPageData<R extends "student" ? StudentSettings : EmployerSettings> | null> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== role) return null;
  const supabase = await createClient();
  const [{ data: profile }, { data: row, error }, { data: auth }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", viewer.id).maybeSingle(),
    supabase.from("user_settings").select("data").eq("user_id", viewer.id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const missing = !!error && (error.code === "42P01" || error.code === "PGRST205");
  const providers = (auth.user?.identities ?? []).map((i) => i.provider);
  return {
    fullName: profile?.full_name ?? viewer.fullName,
    email: viewer.email,
    phone: profile?.phone ?? "",
    usesPassword: providers.length === 0 || providers.includes("email"),
    settings: readSettings(role, row?.data) as R extends "student" ? StudentSettings : EmployerSettings,
    preferencesReady: !missing,
  };
}

/** The employer's saved hiring defaults, or null (no row yet, not an employer, or migration 012 not applied). Never throws. */
export async function getEmployerDefaults(): Promise<EmployerSettings["prefs"] | null> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "employer") return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_settings").select("data").eq("user_id", viewer.id).maybeSingle();
  if (error || !data) return null;
  return readSettings<EmployerSettings>("employer", data.data).prefs;
}
