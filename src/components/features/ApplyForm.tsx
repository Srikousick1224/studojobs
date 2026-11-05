"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import type { ActionResult } from "@/lib/stage-e/result";

/** Application form for a published job. The server action checks eligibility and duplicates. */
export function ApplyForm({
  jobId,
  resumes,
  apply,
}: {
  jobId: string;
  resumes: { id: string; label: string; file_name: string }[];
  apply: (payload: { jobId: string; resumeId?: string; coverNote?: string }) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const coverNote = String(f.get("coverNote") ?? "").trim();
    const resumeId = String(f.get("resumeId") ?? "");
    if (coverNote.length > 2000) {
      setError("Your note must be 2000 characters or fewer.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await apply({ jobId, resumeId: resumeId || undefined, coverNote: coverNote || undefined });
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {resumes.length > 0 ? (
        <Select id="resumeId" name="resumeId" label="Resume" defaultValue="">
          <option value="">Send without a resume</option>
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>{r.label} ({r.file_name})</option>
          ))}
        </Select>
      ) : (
        <Notice>You have no resume uploaded yet. You can still apply; the employer will see your profile.</Notice>
      )}
      <Textarea id="coverNote" name="coverNote" label="Why are you a good fit? (optional)" hint="A few honest sentences are enough. Up to 2000 characters." error={error ?? undefined} />
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || result?.ok === true}>
        <Send className="h-5 w-5" aria-hidden="true" /> {pending ? "Sending…" : "Submit application"}
      </Button>
    </form>
  );
}
