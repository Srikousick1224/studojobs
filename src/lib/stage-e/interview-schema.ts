import { z } from "zod";

export const INTERVIEW_MODES = ["video", "phone", "onsite"] as const;
export const INTERVIEW_MODE_LABEL: Record<(typeof INTERVIEW_MODES)[number], string> = { video: "Video call", phone: "Phone call", onsite: "On-site" };
export const DURATIONS = [15, 30, 45, 60, 90] as const;

/** Same rules in the browser (instant feedback) and in the Server Action (the real check). The database checks them a third time. */
export const interviewInput = z
  .object({
    applicationId: z.uuid(),
    scheduledAt: z.iso.datetime({ offset: true, message: "Choose a date and time." }),
    durationMinutes: z.number().int().min(10).max(240),
    mode: z.enum(INTERVIEW_MODES),
    meetingLink: z.string().trim().max(500, "The link is too long.").optional(),
    location: z.string().trim().max(200, "Use at most 200 characters for the location.").optional(),
    notes: z.string().trim().max(1000, "Notes can be 1000 characters at most.").optional(),
  })
  .superRefine((v, ctx) => {
    if (new Date(v.scheduledAt).getTime() < Date.now() + 5 * 60_000) ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Pick a time at least 5 minutes from now." });
    if (v.meetingLink && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(v.meetingLink)) ctx.addIssue({ code: "custom", path: ["meetingLink"], message: "The meeting link must start with https://" });
    if (v.mode === "video" && !v.meetingLink) ctx.addIssue({ code: "custom", path: ["meetingLink"], message: "Add a meeting link for video interviews." });
    if (v.mode === "onsite" && !v.location) ctx.addIssue({ code: "custom", path: ["location"], message: "Add the address for on-site interviews." });
  });
export type InterviewInput = z.infer<typeof interviewInput>;

export interface InterviewItem {
  id: string;
  applicationId: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: (typeof INTERVIEW_MODES)[number];
  meetingLink: string | null;
  location: string | null;
  notes: string | null;
}
