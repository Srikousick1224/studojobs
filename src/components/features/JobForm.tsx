"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { jobFormSchema } from "@/lib/stage-e/job-schema";
import type { ActionResult } from "@/lib/stage-e/result";

export interface JobFormDefaults {
  title: string;
  summary: string;
  responsibilities: string;
  requirements: string;
  perks: string;
  type: string;
  workMode: string;
  employment: string;
  level: string;
  location: string;
  categoryId: string;
  isPaid: boolean;
  payMin: string;
  payMax: string;
  payPeriod: string;
  deadline: string;
}

export const EMPTY_JOB: JobFormDefaults = {
  title: "",
  summary: "",
  responsibilities: "",
  requirements: "",
  perks: "",
  type: "internship",
  workMode: "hybrid",
  employment: "full_time",
  level: "internship",
  location: "",
  categoryId: "",
  isPaid: true,
  payMin: "",
  payMax: "",
  payPeriod: "month",
  deadline: "",
};

export function JobForm({
  jobId,
  categories,
  initial = EMPTY_JOB,
  save,
  status,
}: {
  jobId?: string;
  categories: { id: number; name: string }[];
  initial?: JobFormDefaults;
  save: (payload: { jobId?: string; form: Record<string, unknown> }) => Promise<ActionResult>;
  status?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isPaid, setIsPaid] = useState(initial.isPaid);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "");
    const form = {
      intent: submitter?.value === "publish" ? "publish" : "draft",
      title: s("title"),
      summary: s("summary"),
      responsibilities: s("responsibilities"),
      requirements: s("requirements"),
      perks: s("perks"),
      type: s("type"),
      workMode: s("workMode"),
      employment: s("employment"),
      level: s("level"),
      location: s("location"),
      categoryId: s("categoryId"),
      isPaid,
      payMin: s("payMin"),
      payMax: s("payMax"),
      payPeriod: isPaid ? s("payPeriod") : "",
      deadline: s("deadline"),
    };

    // Same rules the server applies. The server check is the real one; this only gives faster feedback.
    const check = jobFormSchema.safeParse(form);
    const next: Record<string, string> = {};
    if (!check.success) {
      for (const issue of check.error.issues) next[String(issue.path[0])] ??= issue.message;
    }
    setErrors(next);
    setResult(null);
    if (Object.keys(next).length > 0) return;

    start(async () => {
      const r = await save({ jobId, form });
      setResult(r);
      if (r.ok) {
        router.push("/employer/jobs");
        router.refresh();
      }
    });
  }

  const ready = !!jobId;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      {ready && status && <p className="text-sm text-ink-600">Current status: <span className="font-semibold">{status.replace("_", " ")}</span></p>}
      <Input id="title" name="title" label="Role title" placeholder="e.g. Data Analyst Intern" defaultValue={initial.title} error={errors.title} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Select id="type" name="type" label="Type" defaultValue={initial.type} error={errors.type}>
          <option value="job">Job</option>
          <option value="internship">Internship</option>
          <option value="freelance">Freelance</option>
        </Select>
        <Select id="level" name="level" label="Experience level" defaultValue={initial.level} error={errors.level}>
          <option value="internship">Internship</option>
          <option value="entry">Entry-level</option>
          <option value="graduate">Graduate</option>
          <option value="junior">Junior</option>
        </Select>
        <Select id="workMode" name="workMode" label="Work mode" defaultValue={initial.workMode} error={errors.workMode}>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </Select>
        <Select id="employment" name="employment" label="Hours" defaultValue={initial.employment} error={errors.employment}>
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contract">Contract</option>
        </Select>
        <Input id="location" name="location" label="Location" placeholder="e.g. Chennai, or Remote" defaultValue={initial.location} error={errors.location} />
        <Select id="categoryId" name="categoryId" label="Category" defaultValue={initial.categoryId} error={errors.categoryId}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </Select>
      </div>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink-800">Pay</legend>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="h-4.5 w-4.5 rounded accent-brand-500" />
          This role is paid
        </label>
        {isPaid ? (
          <div className="grid gap-5 sm:grid-cols-3">
            <Input id="payMin" name="payMin" label="Minimum (₹)" type="number" min={1} step="1" defaultValue={initial.payMin} error={errors.payMin} />
            <Input id="payMax" name="payMax" label="Maximum (₹)" type="number" min={1} step="1" defaultValue={initial.payMax} error={errors.payMax} />
            <Select id="payPeriod" name="payPeriod" label="Per" defaultValue={initial.payPeriod} error={errors.payPeriod}>
              <option value="month">Month</option>
              <option value="year">Year</option>
              <option value="project">Project</option>
            </Select>
          </div>
        ) : (
          <Notice tone="warn">Unpaid roles are clearly labelled “Unpaid” on StudoJob so students can decide with full information.</Notice>
        )}
      </fieldset>
      <Textarea id="summary" name="summary" label="Summary" hint="20 to 600 characters. What will the person do, and what will they learn?" defaultValue={initial.summary} error={errors.summary} />
      <Textarea id="responsibilities" name="responsibilities" label="What you will do" hint="One point per line (up to 20)." defaultValue={initial.responsibilities} error={errors.responsibilities} />
      <Textarea id="requirements" name="requirements" label="What we are looking for" hint="One point per line (up to 20)." defaultValue={initial.requirements} error={errors.requirements} />
      <Textarea id="perks" name="perks" label="What you get" hint="One point per line (up to 20). Optional." defaultValue={initial.perks} error={errors.perks} />
      <Input id="deadline" name="deadline" label="Application deadline (optional)" type="date" defaultValue={initial.deadline} error={errors.deadline} />
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>Save draft</Button>
        <Button type="submit" name="intent" value="publish" disabled={pending}>{pending ? "Saving…" : ready ? "Save and publish" : "Publish"}</Button>
      </div>
    </form>
  );
}
