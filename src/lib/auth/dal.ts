import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { fetchProfile } from "@/lib/auth/profile";
import { viewerHome, type Role } from "@/lib/auth/roles";

/**
 * Data Access Layer for "who is this?".
 *
 * The role ALWAYS comes from the `profiles` table (read under RLS as the
 * logged-in user). It never comes from the browser, a form, a URL, or
 * `user_metadata` (which the user can edit). getUser() asks the Auth server
 * to validate the session, so revoked sessions stop working immediately.
 */
export interface Viewer {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isSuspended: boolean;
  /** false = signed in with Google/GitHub but has not yet chosen Student or Employer */
  onboarded: boolean;
}

/** Current verified user, or null (logged out, email not verified, or no profile). Deduped per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email || !user.email_confirmed_at) return null;

  const profile = await fetchProfile(supabase, user.id);
  if (!profile) return null;

  return { id: user.id, email: user.email, ...profile };
});

/** Use at the top of anything that needs a specific role. Redirects instead of rendering for anyone else. */
export async function requireRole(role: Role): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.isSuspended || !viewer.onboarded) redirect(viewerHome(viewer));
  if (viewer.role !== role) redirect(viewerHome(viewer));
  return viewer;
}
