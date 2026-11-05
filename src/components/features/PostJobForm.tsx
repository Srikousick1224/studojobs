"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { BACKEND_NOTICE } from "@/lib/backend";

export function PostJobForm() {
  const [paid, setPaid] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [valid, setValid] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title") ?? "").trim();
    const location = String(f.get("location") ?? "").trim();
    const description = String(f.get("description") ?? "").trim();
    const min = Number(f.get("min"));
    const max = Number(f.get("max"));
    const next: Record<string, string> = {};
    if (title.length < 5) next.title = "Give the role a clear title (5+ characters).";
    if (!location) next.location = "Add a location, or write “Remote”.";
    if (description.length < 80) next.description = `Describe the role in at least 80 characters (currently ${description.length}).`;
    if (paid) {
      if (!(min > 0)) next.min = "Enter a minimum amount above zero.";
      if (!(max >= min)) next.max = "Maximum must be at least the minimum.";
    }
    setErrors(next);
    setValid(Object.keys(next).length === 0);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <Input id="title" name="title" label="Role title" placeholder="e.g. Data Analyst Intern" error={errors.title} />
      <div className="grid gap-5 sm:grid-cols-3">
        <Select id="type" name="type" label="Type" defaultValue="internship">
          <option value="job">Job</option>
          <option value="internship">Internship</option>
          <option value="freelance">Freelance</option>
        </Select>
        <Select id="mode" name="mode" label="Work mode" defaultValue="hybrid">
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </Select>
        <Select id="employment" name="employment" label="Hours" defaultValue="full-time">
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
        </Select>
      </div>
      <Input id="location" name="location" label="Location" error={errors.location} />
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-ink-800">Pay</legend>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4.5 w-4.5 rounded accent-brand-500" />
          This role is paid
        </label>
        {paid ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input id="min" name="min" label="Minimum (₹)" type="number" min={0} error={errors.min} />
            <Input id="max" name="max" label="Maximum (₹)" type="number" min={0} error={errors.max} />
          </div>
        ) : (
          <Notice tone="warn">Unpaid roles are clearly labelled “Unpaid” on StudoJob so students can decide with full information.</Notice>
        )}
      </fieldset>
      <Textarea id="description" name="description" label="Description" hint="What will the person do, and what will they learn?" error={errors.description} className="min-h-40" />
      <Input id="skills" name="skills" label="Skills (comma separated)" placeholder="SQL, Python, Excel" />
      <Button type="submit" size="lg">Submit for review</Button>
      {valid && <Notice tone="success">{BACKEND_NOTICE}</Notice>}
    </form>
  );
}
