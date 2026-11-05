import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth/dal";
import { viewerHome } from "@/lib/auth/roles";
import { logoutAction } from "@/lib/auth/actions";

/** Header buttons: Log in / Sign up for visitors, Dashboard / Log out for signed-in users. */
async function Buttons({ variant }: { variant: "desktop" | "mobile" }) {
  const viewer = await getViewer();
  const mobile = variant === "mobile";
  if (!viewer) {
    return (
      <div className={mobile ? "grid grid-cols-2 gap-3" : "flex items-center gap-2"}>
        <Button href="/login" variant={mobile ? "secondary" : "ghost"} size={mobile ? "md" : "sm"}>Log in</Button>
        <Button href="/register" size={mobile ? "md" : "sm"}>{mobile ? "Sign up" : "Sign up free"}</Button>
      </div>
    );
  }
  return (
    <div className={mobile ? "grid grid-cols-2 gap-3" : "flex items-center gap-2"}>
      <Button href={viewerHome(viewer)} size={mobile ? "md" : "sm"}>{viewer.onboarded ? "Dashboard" : "Finish setup"}</Button>
      <form action={logoutAction} className="contents">
        <Button type="submit" variant={mobile ? "secondary" : "ghost"} size={mobile ? "md" : "sm"}>Log out</Button>
      </form>
    </div>
  );
}

export function AuthNav({ variant }: { variant: "desktop" | "mobile" }) {
  return (
    <Suspense fallback={<div className={variant === "mobile" ? "h-11" : "h-9 w-44"} aria-hidden="true" />}>
      <Buttons variant={variant} />
    </Suspense>
  );
}
