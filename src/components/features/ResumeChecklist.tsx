"use client";

import { Check, RotateCcw } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { checklistProgress, resumeChecklist } from "@/lib/tools/resume-checklist";
import { cn } from "@/lib/utils";

const KEY = "studojob.resumeChecklist.v1";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked: the checklist still works for this visit only */
  }
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function parse(raw: string): Set<string> {
  try {
    const v: unknown = JSON.parse(raw);
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function ResumeChecklist() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const done = parse(raw);
  const { done: count, total, percent } = checklistProgress(done);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(done);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      write([...next]);
    },
    [done],
  );

  const groups = ["Basics", "Content", "Polish"] as const;

  return (
    <section aria-labelledby="resume-check" className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="resume-check" className="text-xl font-bold">Resume checklist</h2>
          <p className="mt-1 text-sm text-ink-500">Tick each item as you fix it. Progress is saved only in this browser.</p>
        </div>
        <button type="button" onClick={() => write([])} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-600 hover:bg-ink-100">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
        </button>
      </div>

      <div className="mt-5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Resume checklist progress">
        <div className="flex justify-between text-sm font-semibold">
          <span>{count} of {total} done</span>
          <span className="text-brand-600">{percent}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-500 transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
        {percent === 100 && <p className="animate-pop mt-3 text-sm font-semibold text-mint-700">Your resume is ready to send.</p>}
      </div>

      <div className="mt-6 space-y-6">
        {groups.map((g) => (
          <fieldset key={g}>
            <legend className="text-xs font-bold uppercase tracking-wider text-ink-400">{g}</legend>
            <ul className="mt-2 space-y-2">
              {resumeChecklist.filter((i) => i.group === g).map((item) => {
                const checked = done.has(item.id);
                return (
                  <li key={item.id}>
                    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition hover:bg-ink-50", checked ? "bg-mint-100/40 ring-mint-400/50" : "ring-ink-100")}>
                      <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(item.id)} />
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500", checked ? "animate-check bg-mint-500 text-white ring-mint-500" : "bg-white ring-ink-300")}>
                        {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </span>
                      <span>
                        <span className={cn("block text-sm font-semibold", checked && "text-ink-500 line-through")}>{item.label}</span>
                        <span className="block text-xs text-ink-500">{item.hint}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </section>
  );
}
