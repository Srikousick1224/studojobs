"use client";

import { Bookmark } from "lucide-react";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { cn } from "@/lib/utils";

export function SaveButton({ jobId, withLabel, className }: { jobId: string; withLabel?: boolean; className?: string }) {
  const { isSaved, toggle } = useSavedJobs();
  const saved = isSaved(jobId);
  return (
    <button
      type="button"
      onClick={() => toggle(jobId)}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save opportunity"}
      className={cn(
        "relative z-10 inline-flex items-center gap-2 rounded-xl p-2.5 text-sm font-semibold transition",
        saved ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
        withLabel && "px-4 ring-1 ring-ink-200",
        className,
      )}
    >
      <Bookmark className={cn("h-5 w-5", saved && "fill-brand-500 text-brand-500")} aria-hidden="true" />
      {withLabel && (saved ? "Saved" : "Save")}
    </button>
  );
}
