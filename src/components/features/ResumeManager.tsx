"use client";

import { FileText, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { deleteResumeAction, getMyResumeLinkAction, setDefaultResumeAction, uploadResumeAction } from "@/lib/student/resume-actions";
import { MAX_RESUME_BYTES, MAX_RESUMES } from "@/lib/student/resume-file";
import type { ActionResult } from "@/lib/stage-e/result";
import type { MyProfile } from "@/lib/student/profile-schema";

const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Upload, list, open, set default and delete resumes. The server checks the real file type and size again. */
export function ResumeManager({ resumes }: { resumes: MyProfile["resumes"] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [fileName, setFileName] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const full = resumes.length >= MAX_RESUMES;

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setResult(null);
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) after?.();
    });
  }

  function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return setResult({ ok: false, message: "Choose a PDF or Word file first." });
    if (file.size > MAX_RESUME_BYTES) return setResult({ ok: false, message: "Your resume must be 5 MB or smaller." });
    if (!/\.(pdf|docx)$/i.test(file.name)) return setResult({ ok: false, message: "Upload a PDF or a Word (.docx) file." });
    run(() => uploadResumeAction(fd), () => { form.current?.reset(); setFileName(""); });
  }

  return (
    <section aria-labelledby="resume-title" className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
      <h2 id="resume-title" className="text-lg font-bold">Resumes</h2>
      <p className="mt-1 text-sm text-ink-500">PDF or Word, up to 5 MB each. Only employers you apply to can open them, and only for a few minutes at a time.</p>

      {resumes.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">No resume yet. Upload one so you can apply in one click.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-100">
          {resumes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><FileText className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate font-semibold text-ink-900">
                  {r.label}
                  {r.isDefault && <span className="ml-2 rounded-full bg-mint-100 px-2 py-0.5 align-middle text-[11px] font-bold text-mint-700">Default</span>}
                </p>
                <p className="truncate text-xs text-ink-500">{r.fileName} · {kb(r.sizeBytes)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(async () => {
                  const l = await getMyResumeLinkAction({ id: r.id });
                  if (l.ok) { window.open(l.url, "_blank", "noopener,noreferrer"); return { ok: true, message: "Opened in a new tab." }; }
                  return l;
                })}>View</Button>
                {!r.isDefault && (
                  <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setDefaultResumeAction({ id: r.id }))}>
                    <Star className="h-4 w-4" aria-hidden="true" /> Make default
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" className="text-rose-700" disabled={pending} aria-label={`Delete ${r.label}`}
                  onClick={() => { if (window.confirm(`Delete "${r.label}"? This cannot be undone.`)) run(() => deleteResumeAction({ id: r.id })); }}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={form} onSubmit={onUpload} className="mt-5 grid gap-4 border-t border-ink-100 pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
        <Input id="resume-label" name="label" label="Label (optional)" placeholder="e.g. Data science resume" maxLength={80} disabled={full} />
        <div>
          <label htmlFor="resume-file" className="mb-1.5 block text-sm font-semibold text-ink-800">File</label>
          <input id="resume-file" name="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={full}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="block w-full cursor-pointer rounded-xl bg-ink-50 text-sm text-ink-700 ring-1 ring-ink-200 file:mr-3 file:cursor-pointer file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600" />
          <span className="sr-only" aria-live="polite">{fileName ? `Selected ${fileName}` : ""}</span>
        </div>
        <Button type="submit" disabled={pending || full}><Upload className="h-4 w-4" aria-hidden="true" /> {pending ? "Working…" : "Upload"}</Button>
      </form>
      {full && <p className="mt-2 text-xs text-ink-500">You have {MAX_RESUMES} resumes, the maximum. Delete one to upload another.</p>}
      {result && <div className="mt-4" role="status"><Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice></div>}
    </section>
  );
}
