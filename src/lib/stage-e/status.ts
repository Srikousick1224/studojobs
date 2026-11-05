/**
 * Pure rules for Stage E (no network, no Supabase). They mirror the database
 * guards in migration 003 (applications_guard, reports_guard, jobs_guard).
 * The database is the real security boundary: these rules only decide which
 * buttons the UI shows and which values the server actions accept.
 */

export const APPLICATION_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "selected",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview scheduled",
  selected: "Selected",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export const STATUS_TONE: Record<ApplicationStatus, "neutral" | "brand" | "mint" | "amber" | "rose" | "sky"> = {
  applied: "neutral",
  under_review: "sky",
  shortlisted: "brand",
  interview_scheduled: "amber",
  selected: "mint",
  rejected: "rose",
  withdrawn: "neutral",
};

/** Statuses where the application is still moving through the pipeline. */
export const ACTIVE_STATUSES: readonly ApplicationStatus[] = ["applied", "under_review", "shortlisted", "interview_scheduled"];

/** Students may withdraw only while the application is active (guard: applications_guard). */
export function canStudentWithdraw(status: ApplicationStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Statuses an employer may set by hand. `interview_scheduled` is set automatically
 * by the interview scheduler, and `applied`/`withdrawn` are never set by employers.
 */
export const EMPLOYER_SETTABLE: readonly ApplicationStatus[] = ["under_review", "shortlisted", "selected", "rejected"];

/** Next statuses an employer can pick for one application. Withdrawn applications are read-only. */
export function employerNextStatuses(current: ApplicationStatus): ApplicationStatus[] {
  if (current === "withdrawn") return [];
  return EMPLOYER_SETTABLE.filter((s) => s !== current);
}

export const APPLICATION_STAGES: readonly ApplicationStatus[] = ["applied", "under_review", "shortlisted", "interview_scheduled", "selected"];

/** Moderator decisions on a listing that is waiting in the review queue. */
export const MODERATION_DECISIONS = ["published", "rejected"] as const;
/** Moderator decisions on an employer's verification request. */
export const VERIFICATION_DECISIONS = ["approved", "rejected"] as const;
/** Moderator decisions on a scam/abuse report. */
export const REPORT_DECISIONS = ["resolved", "dismissed"] as const;
