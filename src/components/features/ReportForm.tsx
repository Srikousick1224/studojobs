"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { BACKEND_NOTICE } from "@/lib/backend";
import { getCompany, jobs } from "@/lib/data";

export function ReportForm({ defaultJobId }: { defaultJobId?: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [valid, setValid] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const job = String(f.get("job") ?? "");
    const reason = String(f.get("reason") ?? "");
    const details = String(f.get("details") ?? "").trim();
    const next: Record<string, string> = {};
    if (!job) next.job = "Choose the listing you want to report.";
    if (!reason) next.reason = "Choose the closest reason.";
    if (details.length < 20) next.details = "Please describe what happened (at least 20 characters).";
    setErrors(next);
    setValid(Object.keys(next).length === 0);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <Select id="job" name="job" label="Listing" defaultValue={defaultJobId ?? ""} error={errors.job}>
        <option value="">Select a listing…</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>{j.title} — {getCompany(j.companySlug)?.name}</option>
        ))}
      </Select>
      <Select id="reason" name="reason" label="What is wrong?" defaultValue="" error={errors.reason}>
        <option value="">Select a reason…</option>
        <option>Asks for money or a fee</option>
        <option>Fake company or impersonation</option>
        <option>Misleading pay or role details</option>
        <option>Asks for sensitive documents too early</option>
        <option>Discriminatory or abusive content</option>
        <option>Something else</option>
      </Select>
      <Textarea id="details" name="details" label="Details" hint="Do not include passwords or bank details." error={errors.details} />
      <Button type="submit" size="lg">Send report</Button>
      {valid && <Notice tone="success">{BACKEND_NOTICE}</Notice>}
    </form>
  );
}
