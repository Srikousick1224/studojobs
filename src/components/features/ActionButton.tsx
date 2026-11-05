"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/stage-e/result";

/**
 * Runs one server action and shows its result. The server action does the real checks;
 * this component only reports what came back. Optional `confirm` asks before running.
 */
export function ActionButton({
  action,
  payload,
  label,
  variant = "secondary",
  confirm,
}: {
  action: (payload: Record<string, string>) => Promise<ActionResult>;
  payload: Record<string, string>;
  label: string;
  variant?: "primary" | "secondary" | "mint" | "danger" | "ghost";
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            setResult(await action(payload));
          });
        }}
      >
        {pending ? "Saving…" : label}
      </Button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={cn("max-w-64 text-right text-xs", result.ok ? "text-mint-700" : "text-rose-700")}>
          {result.message}
        </p>
      )}
    </div>
  );
}
