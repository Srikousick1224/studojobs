import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const control =
  "w-full rounded-xl bg-white px-3.5 text-sm text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-400 transition focus:ring-2 focus:ring-brand-500 focus:outline-none";

export function FieldWrap({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface Shared {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ id, label, hint, error, className, ...rest }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error}>
      <input id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} className={cn(control, "h-11", error && "ring-rose-400", className)} {...rest} />
    </FieldWrap>
  );
}

export function Textarea({ id, label, hint, error, className, ...rest }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error}>
      <textarea id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} className={cn(control, "min-h-28 py-3", error && "ring-rose-400", className)} {...rest} />
    </FieldWrap>
  );
}

export function Select({ id, label, hint, error, className, children, ...rest }: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error}>
      <select id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} className={cn(control, "h-11", error && "ring-rose-400", className)} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
}
