"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { reportListingAction } from "@/lib/report/actions";
import { LISTING_REPORT_REASONS, listingReportInput } from "@/lib/report/schema";
import type { ActionResult } from "@/lib/stage-e/result";

/** Report form for one listing. Validates in the browser for speed; the server action validates again. */
export function ReportForm({ jobId }: { jobId: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = listingReportInput.safeParse({ jobId, reason: String(f.get("reason") ?? ""), details: String(f.get("details") ?? "") });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    start(async () => setResult(await reportListingAction(parsed.data)));
  }

  if (result?.ok) return <Notice tone="success">{result.message}</Notice>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <Select id="reason" name="reason" label="What is wrong?" defaultValue="" error={errors.reason}>
        <option value="">Select a reason…</option>
        {Object.entries(LISTING_REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <Textarea id="details" name="details" label="Details" hint="Do not include passwords or bank details." error={errors.details} />
      {errors.jobId && <Notice tone="error">{errors.jobId}</Notice>}
      {result && !result.ok && <Notice tone="error">{result.message}</Notice>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Send report"}</Button>
    </form>
  );
}
