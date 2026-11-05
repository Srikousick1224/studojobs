import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";
import { fetchProfile } from "@/lib/auth/profile";
import { dashboardRoleForPath, ROLE_HOME } from "@/lib/auth/roles";

/**
 * First line of defence: keeps sessions fresh, sends logged-out visitors to
 * /login, and keeps each role inside its own dashboard.
 *
 * It runs on every request (including client-side navigations, which layouts
 * do NOT re-check), so a role change or suspension takes effect on the next
 * click. The dashboard layouts check the role again (requireRole) and the
 * database enforces it a third time with RLS.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, supabase } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const area = dashboardRoleForPath(pathname);
  if (!area) return response();

  /** Redirect, but keep any cookies the token refresh just set (otherwise the user can be logged out by accident). */
  const redirectTo = (path: string, query = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = query;
    const redirect = NextResponse.redirect(url);
    response().cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!userId || !supabase) return redirectTo("/login", `?next=${encodeURIComponent(pathname + search)}`);

  const profile = await fetchProfile(supabase, userId);
  if (!profile) return redirectTo("/login");
  if (profile.isSuspended) return redirectTo("/auth/suspended");
  if (!profile.onboarded) return redirectTo("/onboarding");
  if (profile.role !== area) return redirectTo(ROLE_HOME[profile.role]);

  return response();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
