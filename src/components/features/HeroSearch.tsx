"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const EXAMPLES = ["Data analyst intern", "React developer", "UI design", "Marketing trainee", "Python", "Remote roles"];

/**
 * Hero search box.
 * - The placeholder types out example searches (paused while the box is focused or has text,
 *   and not animated at all when the visitor prefers reduced motion).
 * - Press "/" anywhere on the page to jump into the box.
 * It still submits a normal GET form to /jobs, so it works without JavaScript.
 */
export function HeroSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeholder, setPlaceholder] = useState("Role, skill or company");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let word = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const full = EXAMPLES[word];
      chars += deleting ? -1 : 1;
      setPlaceholder(full.slice(0, chars) || " ");
      let delay = deleting ? 35 : 75;
      if (!deleting && chars === full.length) {
        deleting = true;
        delay = 1400;
      } else if (deleting && chars === 0) {
        deleting = false;
        word = (word + 1) % EXAMPLES.length;
        delay = 350;
      }
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form action="/jobs" method="get" role="search" className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-2.5 shadow-lift ring-1 ring-ink-100 transition focus-within:ring-2 focus-within:ring-brand-300 sm:flex-row">
      <label htmlFor="hero-q" className="sr-only">Search roles, skills or companies</label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <input
          ref={inputRef}
          id="hero-q"
          name="q"
          type="search"
          maxLength={100}
          placeholder={placeholder}
          onFocus={() => setPaused(true)}
          onBlur={(e) => setPaused(e.currentTarget.value.length > 0)}
          className="h-12 w-full rounded-xl bg-transparent pl-12 pr-12 text-base placeholder:text-ink-400 focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-xs font-semibold text-ink-400 sm:block" aria-hidden="true">/</kbd>
      </div>
      <Button type="submit" size="lg" className="h-12">Search</Button>
    </form>
  );
}
