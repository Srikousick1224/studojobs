"use client";

import { useEffect, useState } from "react";

/** Cycles through short words in the hero headline. The full list is read once by screen readers. */
export function RotatingWord({ words, intervalMs = 2600 }: { words: string[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    const pref = document.documentElement.getAttribute("data-motion");
    if (pref === "reduce" || (pref !== "full" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => window.clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <>
      <span className="sr-only">{words.join(", ")}</span>
      <span key={index} className="animate-word inline-block" aria-hidden="true">{words[index]}</span>
    </>
  );
}
