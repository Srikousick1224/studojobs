"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { ResumeLinkResult } from "@/lib/stage-e/result";

/** Opens a short-lived link to a resume. The server decides whether this employer may see it. */
export function ResumeLinkButton({ resumeId, getLink }: { resumeId: string; getLink: (payload: { resumeId: string }) => Promise<ResumeLinkResult> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await getLink({ resumeId });
            if (r.ok) {
              setError(null);
              window.open(r.url, "_blank", "noopener,noreferrer");
            } else setError(r.message);
          })
        }
      >
        {pending ? "Opening…" : "View resume"}
      </Button>
      {error && <p role="alert" className="max-w-64 text-right text-xs text-rose-700">{error}</p>}
    </div>
  );
}
