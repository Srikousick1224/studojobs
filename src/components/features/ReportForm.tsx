"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { reportCompanyAction, reportListingAction } from "@/lib/report/actions";
import { companyReportInput, LISTING_REPORT_REASONS, listingReportInput } from "@/lib/report/schema";
import type { ActionResult } from "@/lib/stage-e/result";

/** Report form for one listing or one company. Validates in the browser for speed; the server action validates again. */
export function ReportForm(target: { jobId: string; companyId?: never } | { companyId: string; jobId?: never }) {
  const jobId = target.jobId;
  const companyId = target.companyId;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fields = { reason: String(f.get("reason") ?? ""), details: String(f.get("details") ?? "") };
    const parsed = companyId ? companyReportInput.safeParse({ companyId, ...fields }) : listingReportInput.safeParse({ jobId, ...fields });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    start(async () => setResult(companyId ? await reportCompanyAction(parsed.data) : await reportListingAction(parsed.data)));
  }

  if (result?.ok) return <Notice tone="success">{result.message}</Notice>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <Select id="reason" name="reason" label="What is wrong?" defaultValue="" error={errors.reason}>
        <option value="">Select a reason…</option>
        {Object.entries(LISTING_REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <Textarea id="details" name="details" label="Details" hint="Do not include passwords or bank details." error={errors.details} />
      {(errors.jobId || errors.companyId) && <Notice tone="error">{errors.jobId ?? errors.companyId}</Notice>}
      {result && !result.ok && <Notice tone="error">{result.message}</Notice>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Send report"}</Button>
    </form>
  );
}
