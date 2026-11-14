"use client";

import { useRef, type ReactNode } from "react";

/** Gently tilts toward the pointer. Does nothing for touch input or when motion is reduced. */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function motionAllowed() {
    const root = document.documentElement.getAttribute("data-motion");
    if (root === "reduce") return false;
    if (root === "full") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || !motionAllowed()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  }

  function reset() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={className} style={{ transition: "transform 0.2s ease-out" }}>
      {children}
    </div>
  );
}
