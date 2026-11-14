"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Thin progress bar at the top of the page, driven by CSS scroll timelines (hidden where unsupported). */
export function ScrollProgress() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" aria-hidden="true">
      <div className="scroll-progress h-full bg-gradient-to-r from-brand-500 to-mint-500" />
    </div>
  );
}

/** Round button that appears after scrolling down and returns to the top. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="animate-pop fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 text-white shadow-lift transition hover:bg-brand-600 active:scale-95"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
