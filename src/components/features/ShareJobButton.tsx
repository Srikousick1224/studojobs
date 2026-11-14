"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Shares the current job link with the device share sheet, or copies it to the clipboard. */
export function ShareJobButton({ title }: { title: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (next: "copied" | "failed") => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  };

  async function share() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch (err) {
      // Closing the share sheet is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      flash("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
    >
      {state === "copied" ? <Check className="animate-pop h-4 w-4 text-mint-600" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      {state === "copied" ? "Link copied" : state === "failed" ? "Could not copy" : "Share"}
      <span className="sr-only" aria-live="polite">{state === "copied" ? "Link copied to clipboard" : ""}</span>
    </button>
  );
}
