"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import type { ActionResult } from "@/lib/stage-e/result";

export interface CompanyDefaults {
  name: string;
  industry: string;
  sizeRange: string;
  location: string;
  website: string;
  about: string;
}

export function CompanyForm({
  initial,
  save,
}: {
  initial: CompanyDefaults;
  save: (payload: Record<string, string>) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      industry: String(f.get("industry") ?? ""),
      sizeRange: String(f.get("sizeRange") ?? ""),
      location: String(f.get("location") ?? ""),
      website: String(f.get("website") ?? ""),
      about: String(f.get("about") ?? ""),
    };
    const next: Record<string, string> = {};
    if (payload.name.trim().length < 2) next.name = "Enter your company name (2+ characters).";
    if (payload.website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(payload.website.trim())) next.website = "Website must start with https:// (or leave it empty).";
    setErrors(next);
    setResult(null);
    if (Object.keys(next).length) return;
    start(async () => {
      const r = await save(payload);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <Input id="name" name="name" label="Company name" defaultValue={initial.name} error={errors.name} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id="industry" name="industry" label="Industry" placeholder="e.g. Data & AI" defaultValue={initial.industry} />
        <Select id="sizeRange" name="sizeRange" label="Company size" defaultValue={initial.sizeRange}>
          <option value="">Not stated</option>
          {["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map((s) => (
            <option key={s} value={s}>{s} people</option>
          ))}
        </Select>
        <Input id="location" name="location" label="Head office location" defaultValue={initial.location} />
        <Input id="website" name="website" label="Website (optional)" placeholder="https://example.com" defaultValue={initial.website} error={errors.website} />
      </div>
      <Textarea id="about" name="about" label="About the company" hint="Up to 2000 characters." defaultValue={initial.about} />
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save company"}</Button>
    </form>
  );
}
