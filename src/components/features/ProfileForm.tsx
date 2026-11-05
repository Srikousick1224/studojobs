"use client";

import { useState } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { BACKEND_NOTICE } from "@/lib/backend";
import { skillSuggestions } from "@/lib/data";

const MAX_MB = 5;
const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function ProfileForm() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [valid, setValid] = useState(false);

  function addSkill(raw: string) {
    const s = raw.trim();
    if (!s || skills.some((x) => x.toLowerCase() === s.toLowerCase()) || skills.length >= 20) return;
    setSkills([...skills, s]);
    setSkillInput("");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError("");
    if (!f) return setFile(null);
    if (!allowed.includes(f.type)) {
      setFile(null);
      return setFileError("Please choose a PDF or Word (.docx) file.");
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      return setFileError(`File is too large. The limit is ${MAX_MB} MB.`);
    }
    setFile(f);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (String(f.get("name") ?? "").trim().length < 2) next.name = "Enter your full name.";
    if (String(f.get("college") ?? "").trim().length < 2) next.college = "Enter your college or university.";
    if (skills.length === 0) next.skills = "Add at least one skill.";
    setErrors(next);
    setValid(Object.keys(next).length === 0 && !fileError);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id="name" name="name" label="Full name" autoComplete="name" error={errors.name} />
        <Input id="headline" name="headline" label="Headline" placeholder="e.g. Final-year data science student" />
        <Input id="college" name="college" label="College / university" error={errors.college} />
        <Input id="degree" name="degree" label="Degree and branch" placeholder="B.Tech, AI & Data Science" />
        <Select id="year" name="year" label="Graduation year" defaultValue="2027">
          {["2026", "2027", "2028", "2029", "2030"].map((y) => <option key={y}>{y}</option>)}
        </Select>
      </div>

      <div>
        <label htmlFor="skill" className="block text-sm font-semibold text-ink-800">Skills</label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="skill"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
            placeholder="Type a skill and press Enter"
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
        <p className="mt-3 text-xs text-ink-500">
          Suggestions:{" "}
          {skillSuggestions.filter((s) => !skills.includes(s)).map((s) => (
            <button key={s} type="button" onClick={() => addSkill(s)} className="mr-1.5 rounded-md bg-ink-50 px-2 py-1 font-medium text-ink-600 hover:bg-ink-100">+ {s}</button>
          ))}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink-800">Resume</p>
        <label htmlFor="resume" className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-300 px-4 py-5 text-sm text-ink-600 transition hover:border-brand-400 hover:bg-brand-50/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
          <FileUp className="h-6 w-6 text-brand-600" aria-hidden="true" />
          <span>{file ? <strong className="text-ink-900">{file.name}</strong> : `Choose a PDF or DOCX (max ${MAX_MB} MB)`}</span>
          <input id="resume" type="file" accept=".pdf,.docx" onChange={onFile} className="sr-only" />
        </label>
        {fileError && <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{fileError}</p>}
        <p className="mt-1.5 text-xs text-ink-500">The file is checked here but not uploaded until private cloud storage is connected in Phase 2.</p>
      </div>

      <Button type="submit" size="lg">Save profile</Button>
      {valid && <Notice tone="success">{BACKEND_NOTICE}</Notice>}
    </form>
  );
}
