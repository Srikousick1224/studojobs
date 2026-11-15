"use client";

import { Check, Loader2 } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Misc";
import type { ActionResult } from "@/lib/stage-e/result";
import { cn } from "@/lib/utils";

/** Accessible on/off switch (role="switch") with a label and optional helper text. */
export function SwitchRow({ label, text, checked, onChange, disabled }: { label: string; text?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p id={`${id}-l`} className="text-sm font-semibold text-ink-900">{label}</p>
        {text && <p id={`${id}-d`} className="mt-0.5 text-sm text-ink-500">{text}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={text ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="switch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50"
      />
    </div>
  );
}

/** Multi-select pills built from real checkboxes. */
export function ChipGroup<T extends string>({ legend, options, value, onChange }: { legend: string; options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink-800">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <label key={o.value} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition active:scale-95 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500",
              on ? "bg-brand-500 text-white ring-brand-500" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])} />
              {on && <Check className="h-4 w-4" aria-hidden="true" />}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Runs a Server Action, tracks pending state and shows the result in a status line that screen readers announce. */
export function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  function run(fn: () => Promise<ActionResult>, after?: (r: ActionResult) => void) {
    setResult(null);
    start(async () => {
      const r = await fn();
      setResult(r);
      after?.(r);
    });
  }
  return { pending, result, run };
}

export function ResultNote({ result }: { result: ActionResult | null }) {
  if (!result) return <div aria-live="polite" className="sr-only" />;
  return <div className="panel-in"><Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice></div>;
}

export function SaveBar({ pending, label = "Save changes", children }: { pending: boolean; label?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</> : label}
      </Button>
      {children}
    </div>
  );
}

export function SettingsCard({ title, text, children, danger }: { title: string; text?: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={cn("rounded-2xl bg-white p-6 shadow-soft ring-1", danger ? "ring-rose-200" : "ring-ink-100")}>
      <h2 className="text-lg font-bold">{title}</h2>
      {text && <p className="mt-1 text-sm text-ink-500">{text}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
