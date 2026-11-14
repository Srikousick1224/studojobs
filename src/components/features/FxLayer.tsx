"use client";

import { useEffect } from "react";

/**
 * Decorative effects: a scroll progress bar and a soft spotlight that follows the pointer.
 * Everything visual is CSS (see globals.css); this only feeds the pointer position into two CSS
 * variables, and does nothing on touch screens or when effects are not "lively".
 */
export function FxLayer() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (root.getAttribute("data-fx") !== "lively") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty("--mx", `${e.clientX}px`);
        root.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div className="fx-progress" aria-hidden="true" />
      <div className="fx-spot" aria-hidden="true" />
    </>
  );
}
