"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { setSavedJobAction } from "@/lib/saved/actions";
import type { SaveMode } from "@/lib/saved/queries";
import { cn } from "@/lib/utils";

/**
 * Saves a job to the student's account (database, not this browser).
 * mode "guest" sends visitors to sign in, "hidden" renders nothing (employers/admins).
 */
export function SaveButton({ jobId, withLabel, className, mode = "guest", initialSaved = false }: { jobId: string; withLabel?: boolean; className?: string; mode?: SaveMode; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (mode === "hidden") return null;

  const base = cn(
    "relative z-10 inline-flex items-center gap-2 rounded-xl p-2.5 text-sm font-semibold transition",
    optimistic ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
    withLabel && "px-4 ring-1 ring-ink-200",
    className,
  );
  const icon = <Bookmark className={cn("h-5 w-5", optimistic && "fill-brand-500 text-brand-500")} aria-hidden="true" />;

  if (mode === "guest") {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`} aria-label="Sign in to save this opportunity" className={base} title="Sign in to save">
        {icon}
        {withLabel && "Save"}
      </Link>
    );
  }

  function toggle() {
    const next = !saved;
    setError("");
    start(async () => {
      setOptimistic(next);
      const res = await setSavedJobAction({ jobId, save: next });
      if (res.ok) setSaved(next);
      else setError(res.message);
    });
  }

  return (
    <span className="relative z-10 inline-flex flex-col items-end">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={optimistic} aria-label={optimistic ? "Remove from saved" : "Save opportunity"} className={base}>
        {icon}
        {withLabel && (optimistic ? "Saved" : "Save")}
      </button>
      {error && <span role="alert" className="mt-1 max-w-48 text-right text-xs text-rose-600">{error}</span>}
    </span>
  );
}
