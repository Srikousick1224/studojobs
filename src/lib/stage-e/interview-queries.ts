import "server-only";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { INTERVIEW_MODES, type InterviewItem } from "./interview-schema";

const row = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  scheduled_at: z.string(),
  duration_minutes: z.number(),
  mode: z.enum(INTERVIEW_MODES),
  meeting_link: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
});

/**
 * Upcoming (still scheduled) interviews, grouped by application id. Runs as the signed-in user, so an employer
 * only sees interviews for their own applicants and a student only sees their own. Never throws.
 */
export async function listUpcomingInterviews(): Promise<Map<string, InterviewItem[]>> {
  const out = new Map<string, InterviewItem[]>();
  if (!isSupabaseConfigured()) return out;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("interviews")
      .select("id, application_id, scheduled_at, duration_minutes, mode, meeting_link, location, notes")
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(300);
    for (const r of Array.isArray(data) ? data : []) {
      const p = row.safeParse(r);
      if (!p.success) continue;
      const i: InterviewItem = { id: p.data.id, applicationId: p.data.application_id, scheduledAt: p.data.scheduled_at, durationMinutes: p.data.duration_minutes, mode: p.data.mode, meetingLink: p.data.meeting_link, location: p.data.location, notes: p.data.notes };
      out.set(i.applicationId, [...(out.get(i.applicationId) ?? []), i]);
    }
  } catch {
    /* an interview list problem must not break the page */
  }
  return out;
}
