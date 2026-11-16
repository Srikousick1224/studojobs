"use client";

import { CalendarPlus, Video, Phone, MapPin, X } from "lucide-react";
import { useState, useTransition } from "react";
import { ActionButton } from "@/components/features/ActionButton";
import { LocalTime } from "@/components/features/LocalTime";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { cancelInterviewAction, scheduleInterviewAction } from "@/lib/stage-e/interview-actions";
import { DURATIONS, INTERVIEW_MODES, INTERVIEW_MODE_LABEL, interviewInput, type InterviewItem } from "@/lib/stage-e/interview-schema";
import type { ActionResult } from "@/lib/stage-e/result";

const MODE_ICON = { video: Video, phone: Phone, onsite: MapPin } as const;

/** Local "YYYY-MM-DDTHH:mm" for the datetime-local input's min value. */
const localNow = () => { const d = new Date(Date.now() + 10 * 60_000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function InterviewPanel({ applicationId, interviews, canSchedule }: { applicationId: string; interviews: InterviewItem[]; canSchedule: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<(typeof INTERVIEW_MODES)[number]>("video");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const p = `iv-${applicationId}`;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const when = String(f.get("when") ?? "");
    const parsed = interviewInput.safeParse({
      applicationId,
      scheduledAt: when ? new Date(when).toISOString() : "",
      durationMinutes: Number(f.get("duration")),
      mode,
      meetingLink: String(f.get("link") ?? ""),
      location: String(f.get("location") ?? ""),
      notes: String(f.get("notes") ?? ""),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      const keyOf: Record<string, string> = { scheduledAt: "when", meetingLink: "link" };
      for (const i of parsed.error.issues) { const k = String(i.path[0]); next[keyOf[k] ?? k] ??= i.message; }
      setErrors(next);
      setResult(null);
      return;
    }
    setErrors({});
    start(async () => {
      const r = await scheduleInterviewAction(parsed.data);
      setResult(r);
      if (r.ok) setOpen(false);
    });
  }

  return (
    <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
      {interviews.map((i) => {
        const Icon = MODE_ICON[i.mode];
        return (
          <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm">
            <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <div className="min-w-0 flex-1 basis-56">
              <p className="font-semibold text-ink-900"><LocalTime iso={i.scheduledAt} /> · {i.durationMinutes} min · {INTERVIEW_MODE_LABEL[i.mode]}</p>
              {(i.location || i.meetingLink) && <p className="truncate text-xs text-ink-600">{i.location ?? i.meetingLink}</p>}
            </div>
            <ActionButton action={cancelInterviewAction as (p: Record<string, string | number>) => Promise<ActionResult>} payload={{ interviewId: i.id }} label="Cancel" variant="ghost" confirm="Cancel this interview? The student will see it removed." />
          </div>
        );
      })}

      {canSchedule && !open && (
        <Button type="button" variant="secondary" size="sm" onClick={() => { setOpen(true); setResult(null); }}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" /> {interviews.length ? "Schedule another" : "Schedule interview"}
        </Button>
      )}
      {result?.ok && !open && <Notice tone="success">{result.message}</Notice>}

      {open && (
        <form onSubmit={submit} noValidate className="panel-in space-y-4 rounded-xl bg-ink-50 p-4" aria-label="Schedule an interview">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id={`${p}-when`} name="when" type="datetime-local" label="Date and time" min={localNow()} error={errors.when} />
            <Select id={`${p}-duration`} name="duration" label="Length" defaultValue="30">
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </Select>
            <Select id={`${p}-mode`} label="Type" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              {INTERVIEW_MODES.map((m) => <option key={m} value={m}>{INTERVIEW_MODE_LABEL[m]}</option>)}
            </Select>
          </div>
          {mode === "onsite" ? (
            <Input id={`${p}-location`} name="location" label="Address" placeholder="Office address and floor" error={errors.location} />
          ) : (
            <Input id={`${p}-link`} name="link" label={mode === "video" ? "Meeting link" : "Meeting link (optional)"} placeholder="https://meet.example.com/…" error={errors.link} />
          )}
          <Textarea id={`${p}-notes`} name="notes" label="Note for the student (optional)" rows={2} maxLength={1000} error={errors.notes} />
          {result && !result.ok && <Notice tone="error">{result.message}</Notice>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Scheduling…" : "Send invite"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" aria-hidden="true" /> Close</Button>
          </div>
        </form>
      )}
    </div>
  );
}
