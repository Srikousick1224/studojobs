"use client";

import { ArrowRight, Command, CornerDownLeft, Palette, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ACCENTS, ACCENT_LABEL, type Accent } from "@/lib/appearance/settings";
import { resetAppearance, updateAppearance, useAppearance } from "@/lib/appearance/store";
import { filterItems } from "@/lib/palette-filter";
import { cn } from "@/lib/utils";

export const OPEN_PALETTE_EVENT = "studojob:open-palette";

interface Item {
  id: string;
  group: "Go to" | "Appearance";
  label: string;
  hint?: string;
  run: () => void;
}

const pages: [string, string][] = [
  ["Home", "/"],
  ["Jobs", "/jobs"],
  ["Internships", "/internships"],
  ["Companies", "/companies"],
  ["Career resources", "/resources"],
  ["Appearance settings", "/settings"],
  ["Report a listing", "/report"],
  ["Log in", "/login"],
  ["Create an account", "/register"],
  ["Student dashboard", "/student"],
  ["Employer dashboard", "/employer"],
];

export function CommandPalette() {
  const router = useRouter();
  const appearance = useAppearance();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const close = useCallback(() => ref.current?.close(), []);
  const open = useCallback(() => {
    const d = ref.current;
    if (!d || d.open) return;
    setQuery("");
    setActive(0);
    d.showModal();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (ref.current?.open) close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, open);
    };
  }, [open, close]);

  const items = useMemo<Item[]>(() => {
    const go: Item[] = pages.map(([label, href]) => ({ id: `go-${href}`, group: "Go to", label, hint: href, run: () => router.push(href) }));
    const look: Item[] = [
      { id: "t-light", group: "Appearance", label: "Theme: Light", run: () => updateAppearance({ theme: "light" }) },
      { id: "t-dark", group: "Appearance", label: "Theme: Dark", run: () => updateAppearance({ theme: "dark" }) },
      { id: "t-system", group: "Appearance", label: "Theme: Match my device", run: () => updateAppearance({ theme: "system" }) },
      ...ACCENTS.map((a: Accent) => ({ id: `a-${a}`, group: "Appearance" as const, label: `Accent colour: ${ACCENT_LABEL[a]}`, run: () => updateAppearance({ accent: a }) })),
      { id: "contrast", group: "Appearance", label: appearance.contrast ? "High contrast: turn off" : "High contrast: turn on", run: () => updateAppearance({ contrast: !appearance.contrast }) },
      { id: "motion", group: "Appearance", label: appearance.motion === "reduce" ? "Animations: turn on" : "Animations: reduce", run: () => updateAppearance({ motion: appearance.motion === "reduce" ? "full" : "reduce" }) },
      { id: "reset", group: "Appearance", label: "Reset appearance to defaults", run: () => resetAppearance() },
    ];
    return [...go, ...look];
  }, [router, appearance.contrast, appearance.motion]);

  const results = useMemo(() => filterItems(items, query), [items, query]);
  const current = Math.min(active, Math.max(results.length - 1, 0));

  function choose(item: Item | undefined) {
    if (!item) return;
    close();
    item.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (Math.min(i, results.length - 1) + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (Math.min(i, results.length - 1) - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[current]);
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${current}`)?.scrollIntoView({ block: "nearest" });
  }, [current, listId]);

  return (
    <dialog
      ref={ref}
      aria-label="Command palette"
      onClick={(e) => e.target === ref.current && close()}
      className="palette mx-auto mb-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white p-0 text-ink-900 shadow-lift ring-1 ring-ink-100"
    >
      <div className="flex items-center gap-3 border-b border-ink-100 px-4">
        <Search className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results.length ? `${listId}-${current}` : undefined}
          aria-label="Search pages and settings"
          placeholder="Search pages and settings"
          className="h-14 w-full bg-transparent text-base placeholder:text-ink-400 focus:outline-none"
        />
        <kbd className="hidden rounded-md bg-ink-100 px-1.5 py-0.5 text-xs font-semibold text-ink-500 sm:block">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-500">Nothing matches “{query}”.</li>}
        {results.map((item, i) => {
          const showGroup = i === 0 || results[i - 1].group !== item.group;
          return (
            <li key={item.id} role="presentation">
              {showGroup && <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-ink-400">{item.group}</p>}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === current}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(item)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold", i === current ? "bg-brand-50 text-brand-700" : "text-ink-700")}
              >
                {item.group === "Go to" ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Palette className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs font-normal text-ink-400">{item.hint}</span>}
                {i === current && <CornerDownLeft className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-1.5 border-t border-ink-100 px-4 py-2.5 text-xs text-ink-400">
        <Command className="h-3.5 w-3.5" aria-hidden="true" /> + K opens this anywhere. Use ↑ ↓ to move, Enter to choose.
      </p>
    </dialog>
  );
}

/** Header button that opens the palette. */
export function PaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-keyshortcuts="Control+K Meta+K"
      title="Open the command palette (Ctrl K)"
      className="flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-ink-500 ring-1 ring-ink-200 transition hover:bg-ink-100 hover:text-ink-900 active:scale-95"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      {/* The visible word is also the accessible name (WCAG 2.5.3 "label in name"); on small screens it is read aloud only. */}
      <span className="sr-only lg:not-sr-only">Search</span>
      <kbd aria-hidden="true" className="hidden rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold lg:inline">Ctrl K</kbd>
    </button>
  );
}
