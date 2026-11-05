"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { control, FieldWrap } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

/** Password input with a show/hide toggle. Same look as <Input>. */
export function PasswordField({
  id,
  label,
  hint,
  error,
  className,
  ...rest
}: { id: string; label: string; hint?: string; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id">) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={cn(control, "h-11 pr-11", error && "ring-rose-400", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-ink-500 hover:text-ink-800 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
    </FieldWrap>
  );
}
