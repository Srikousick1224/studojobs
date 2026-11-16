import { Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { RoleShell } from "@/components/layout/RoleShells";
import { requireRole } from "@/lib/auth/dal";
import { getUnreadCount } from "@/lib/notifications/queries";
import type { Role } from "@/lib/auth/roles";

/**
 * Server-side gate for a whole dashboard. Checks the role stored in the
 * database before rendering anything inside. (proxy.ts checks too, and RLS
 * protects the data itself: three independent layers.)
 */
async function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const viewer = await requireRole(role);
  const unread = role === "admin" ? 0 : await getUnreadCount();
  return <RoleShell role={role} userName={viewer.fullName || viewer.email} unread={unread}>{children}</RoleShell>;
}

export function RoleLayout({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-ink-500" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Loading your dashboard…
        </div>
      }
    >
      <Guard role={role}>{children}</Guard>
    </Suspense>
  );
}
