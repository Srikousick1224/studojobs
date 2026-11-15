"use client";

import { createElement, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** True unless the person asked for less motion (system setting or the Settings page choice). */
export function motionAllowed(): boolean {
  if (typeof document === "undefined") return false;
  const pref = document.documentElement.getAttribute("data-motion");
  if (pref === "reduce") return false;
  if (pref === "full") return true;
  return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** Calls `onSeen` once when the element is at least a little on screen. Falls back to "seen" when IntersectionObserver is missing. */
function useSeen<T extends Element>(onSeen: () => void, threshold = 0.18) {
  const ref = useRef<T>(null);
  const cb = useRef(onSeen);
  useEffect(() => { cb.current = onSeen; });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { cb.current(); return; }
    const item = { el, show: () => { cb.current(); io.disconnect(); } };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { pending.delete(item); item.show(); }
    }, { threshold, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    pending.add(item);
    startSweeper();
    return () => { pending.delete(item); io.disconnect(); };
  }, [threshold]);
  return ref;
}

/**
 * Content that was scrolled PAST without ever being on screen (End key, anchor jump, fast scrollbar drag) never
 * triggers IntersectionObserver, so it would stay invisible if the person scrolls back up slowly. One shared
 * scroll listener reveals anything that is now fully above the viewport.
 */
const pending = new Set<{ el: Element; show: () => void }>();
let sweeperOn = false;
function sweep() {
  for (const item of [...pending]) {
    if (item.el.getBoundingClientRect().bottom < 0) { pending.delete(item); item.show(); }
  }
}
function startSweeper() {
  if (sweeperOn || typeof window === "undefined") return;
  sweeperOn = true;
  let raf = 0;
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sweep(); }); }, { passive: true });
}

type Variant = "up" | "fade" | "scale" | "blur" | "left" | "right";

/**
 * Apple-style entrance: content fades, drifts and un-blurs into place when it scrolls into view.
 * Hidden only when JavaScript is running (html.js), so a no-JS visitor still sees everything.
 */
export function Reveal({ children, variant = "up", delay = 0, as = "div", className, style }: {
  children: ReactNode; variant?: Variant; delay?: number; as?: "div" | "section" | "li" | "article" | "ul" | "ol" | "p" | "span"; className?: string; style?: CSSProperties;
}) {
  const [shown, setShown] = useState(false);
  const ref = useSeen<HTMLElement>(() => setShown(true));
  return createElement(as, { ref, className: cn("rv", `rv-${variant}`, shown && "rv-in", className), style: { ...style, "--d": `${delay}ms` } as CSSProperties }, children);
}

/** A number that counts up from 0 the first time it is seen. Shows the real value without JavaScript or with reduced motion. */
export function CountUp({ value, duration = 1100, className, suffix = "" }: { value: number; duration?: number; className?: string; suffix?: string }) {
  const [shown, setShown] = useState(false);
  const ref = useSeen<HTMLSpanElement>(() => setShown(true), 0.4);
  const [n, setN] = useState(value);
  const animate = useRef(false);

  useLayoutEffect(() => {
    animate.current = motionAllowed() && value > 0;
    if (animate.current) setN(0);
  }, [value]);

  useEffect(() => {
    if (!shown || !animate.current) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 4)))); // ease-out quart: fast start, soft landing
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, value, duration]);

  return <span ref={ref} className={cn("tabular-nums", className)}>{n.toLocaleString("en-IN")}{suffix}</span>;
}

/** Moves its children slower than the page scrolls, for a sense of depth. Off with reduced motion. */
export function Parallax({ children, speed = 0.12, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.min(window.scrollY, 1400);
      el.style.transform = `translate3d(0, ${(y * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [speed]);
  return <div ref={ref} className={cn("will-change-transform", className)}>{children}</div>;
}

/** Soft light that follows the cursor across a card (sets --mx/--my for the .spotlight CSS). */
export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={cn("spotlight", className)}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

export interface StoryStep { kicker: string; title: string; text: string; visual: ReactNode }

/**
 * Scroll story (the "Apple product page" effect): a tall section whose content stays pinned while you scroll.
 * The scroll position picks the active step; the text on the left sharpens and the picture on the right swaps.
 */
export function ScrollStory({ steps, className }: { steps: StoryStep[]; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // On very small/short screens or with reduced motion, show a plain stacked list instead of a pinned scene.
    const enable = motionAllowed() && window.innerHeight >= 520;
    setOn(enable);
    if (!enable) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      el.style.setProperty("--p", p.toFixed(3));
      setActive(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [steps.length]);

  if (!on) {
    return (
      <div ref={wrap} className={cn("mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8", className)}>
        {steps.map((s, i) => (
          <Reveal key={s.title} className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-brand-600">{String(i + 1).padStart(2, "0")} · {s.kicker}</p>
              <h3 className="mt-2 text-3xl font-extrabold">{s.title}</h3>
              <p className="mt-3 text-lg text-ink-600">{s.text}</p>
            </div>
            <div>{s.visual}</div>
          </Reveal>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrap} className={cn("story relative", className)} style={{ height: `${steps.length * 85 + 40}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <ol className="space-y-7">
              {steps.map((s, i) => (
                <li key={s.title} className={cn("story-step", i === active ? "is-active" : i < active ? "is-past" : "")} aria-current={i === active ? "step" : undefined}>
                  <p className="text-sm font-bold uppercase tracking-wider text-brand-600">{String(i + 1).padStart(2, "0")} · {s.kicker}</p>
                  <h3 className="mt-1 text-3xl font-extrabold sm:text-5xl">{s.title}</h3>
                  <p className="story-text mt-2 max-w-md text-lg text-ink-600">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-9 h-1 w-48 overflow-hidden rounded-full bg-ink-200" aria-hidden="true">
              <div className="story-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-500" />
            </div>
          </div>
          <div className="story-stage relative mx-auto aspect-[5/4] w-full max-w-lg" aria-hidden="true">
            {steps.map((s, i) => (
              <div key={s.title} className={cn("story-visual absolute inset-0 flex items-center justify-center", i === active ? "is-active" : i < active ? "is-past" : "")}>
                {s.visual}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
