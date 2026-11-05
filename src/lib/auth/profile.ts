import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Role } from "@/lib/auth/roles";

/**
 * Reads the signed-in user's own profile row (RLS: you can only read yours).
 * This is the ONE place the app learns a user's role, suspension and onboarding state.
 */
export interface ProfileInfo {
  role: Role;
  fullName: string;
  isSuspended: boolean;
  /** false = signed in with Google/GitHub and has not yet chosen Student or Employer */
  onboarded: boolean;
}

const row = z.object({
  role: z.enum(["student", "employer", "admin"]),
  full_name: z.string(),
  is_suspended: z.boolean(),
  onboarded_at: z.string().nullable().optional(),
});

export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<ProfileInfo | null> {
  const first = await supabase.from("profiles").select("role, full_name, is_suspended, onboarded_at").eq("id", userId).maybeSingle();
  let data: unknown = first.data;
  let legacy = false;
  if (first.error?.code === "42703") {
    // Column missing = migration 007 is not applied to this database yet. Everyone is then treated as
    // already onboarded, so existing email/password users keep working. Remove once 007 is live everywhere.
    legacy = true;
    ({ data } = await supabase.from("profiles").select("role, full_name, is_suspended").eq("id", userId).maybeSingle());
  }
  const parsed = row.safeParse(data);
  if (!parsed.success) return null;
  return {
    role: parsed.data.role,
    fullName: parsed.data.full_name,
    isSuspended: parsed.data.is_suspended,
    onboarded: legacy || !!parsed.data.onboarded_at,
  };
}
