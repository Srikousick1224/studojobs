import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { viewerHome } from "@/lib/auth/roles";

/** Drop into /login and /register (inside <Suspense>): people who are already logged in go to their dashboard. */
export async function RedirectIfSignedIn() {
  const viewer = await getViewer();
  if (viewer && !viewer.isSuspended) redirect(viewerHome(viewer));
  return null;
}
