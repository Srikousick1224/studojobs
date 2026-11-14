"use client";

import { useState, useTransition } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { saveProfileAction } from "@/lib/student/profile-actions";
import { profileInput, type MyProfile } from "@/lib/student/profile-schema";
import type { ActionResult } from "@/lib/stage-e/result";

const YEARS = Array.from({ length: 9 }, (_, i) => String(2024 + i));

export function ProfileForm({ initial }: { initial: MyProfile }) {
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [skillInput, setSkillInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  function addSkill(raw: string) {
    const s = raw.trim();
    if (!s || skills.some((x) => x.toLowerCase() === s.toLowerCase()) || skills.length >= 20) return;
    setSkills([...skills, s]);
    setSkillInput("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const year = String(f.get("year") ?? "");
    const parsed = profileInput.safeParse({
      fullName: String(f.get("name") ?? ""),
      headline: String(f.get("headline") ?? ""),
      bio: String(f.get("bio") ?? ""),
      college: String(f.get("college") ?? ""),
      degree: String(f.get("degree") ?? ""),
      location: String(f.get("location") ?? ""),
      graduationYear: year ? Number(year) : undefined,
      skills,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      const keyOf: Record<string, string> = { fullName: "name", graduationYear: "year" };
      for (const i of parsed.error.issues) { const k = String(i.path[0]); next[keyOf[k] ?? k] ??= i.message; }
      setErrors(next);
      setResult(null);
      return;
    }
    setErrors({});
    start(async () => setResult(await saveProfileAction(parsed.data)));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id="name" name="name" label="Full name" autoComplete="name" defaultValue={initial.fullName} error={errors.name} />
        <Input id="headline" name="headline" label="Headline" placeholder="e.g. Final-year data science student" defaultValue={initial.headline} error={errors.headline} />
        <Input id="college" name="college" label="College / university" defaultValue={initial.college} error={errors.college} />
        <Input id="degree" name="degree" label="Degree and branch" placeholder="B.Tech, AI & Data Science" defaultValue={initial.degree} error={errors.degree} />
        <Select id="year" name="year" label="Graduation year" defaultValue={initial.graduationYear ? String(initial.graduationYear) : ""} error={errors.year}>
          <option value="">Not set</option>
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </Select>
        <Input id="location" name="location" label="Location" placeholder="e.g. Chennai" defaultValue={initial.location} error={errors.location} />
      </div>
      <Textarea id="bio" name="bio" label="About you" hint="Two or three honest sentences about what you study and want to do." defaultValue={initial.bio} error={errors.bio} />

      <div>
        <label htmlFor="skill" className="block text-sm font-semibold text-ink-800">Skills</label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="skill"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
            placeholder="Type a skill and press Enter"
            maxLength={40}
            className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          <Button type="button" variant="secondary" onClick={() => addSkill(skillInput)}>Add</Button>
        </div>
        {errors.skills && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{errors.skills}</p>}
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Your skills">
          {skills.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm font-semibold text-brand-700">
              {s}
              <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="rounded-full p-0.5 hover:bg-brand-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        {initial.suggestions.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).length > 0 && (
          <p className="mt-3 text-xs text-ink-500">
            Suggestions:{" "}
            {initial.suggestions.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).slice(0, 10).map((s) => (
              <button key={s} type="button" onClick={() => addSkill(s)} className="mr-1.5 mb-1.5 rounded-md bg-ink-50 px-2 py-1 font-medium text-ink-600 hover:bg-ink-100">+ {s}</button>
            ))}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-ink-800">Resume</p>
        {initial.resumes.length > 0 ? (
          <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
            {initial.resumes.map((r) => <li key={r.id} className="flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />{r.label} <span className="text-ink-500">({r.fileName})</span></li>)}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm text-ink-500">No resume yet.</p>
        )}
        <p className="mt-1.5 text-xs text-ink-500">Resume upload is coming next. It needs private cloud storage, which we will test on the real Supabase project first.</p>
      </div>

      {result && <Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}
