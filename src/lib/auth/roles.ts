import { safeNextPath } from "@/lib/safe-redirect";

export type Role = "student" | "employer" | "admin";

export const ROLE_HOME: Record<Role, string> = {
  student: "/student",
  employer: "/employer",
  admin: "/admin",
};

export function isRole(v: unknown): v is Role {
  return v === "student" || v === "employer" || v === "admin";
}

/** Which role owns this path? "/student/saved" -> "student". Null for public pages. */
export function dashboardRoleForPath(pathname: string): Role | null {
  for (const role of Object.keys(ROLE_HOME) as Role[]) {
    const base = ROLE_HOME[role];
    if (pathname === base || pathname.startsWith(`${base}/`)) return role;
  }
  return null;
}

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/onboarding", "/auth"];

/**
 * Where to send someone after login. Honours ?next= only when it is a safe,
 * same-site path that this role may open. Anything else -> the role's own home.
 */
export function postLoginPath(next: string | null | undefined, role: Role): string {
  const home = ROLE_HOME[role];
  const safe = safeNextPath(next, home);
  const pathOnly = safe.split(/[?#]/)[0];
  const owner = dashboardRoleForPath(pathOnly);
  if (owner && owner !== role) return home;
  if (AUTH_PAGES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) return home;
  return safe;
}

/** Where a signed-in person belongs right now: suspended page, role-choice page, or their dashboard. */
export function viewerHome(v: { role: Role; isSuspended: boolean; onboarded: boolean }): string {
  if (v.isSuspended) return "/auth/suspended";
  if (!v.onboarded) return "/onboarding";
  return ROLE_HOME[v.role];
}
