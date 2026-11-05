import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <Ban className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-3xl font-extrabold">Account suspended</h1>
      <p className="text-ink-500">This account has been suspended, so the dashboard is unavailable. If you think this is a mistake, please contact StudoJob support.</p>
      <form action={logoutAction}><Button type="submit" variant="secondary" size="lg" className="w-full">Log out</Button></form>
    </div>
  );
}
