import { z } from "zod";
import { APPLICATION_STATUSES, EMPLOYER_SETTABLE, MODERATION_DECISIONS, REPORT_DECISIONS, VERIFICATION_DECISIONS, type ApplicationStatus } from "./status";

/** Every action re-validates its input on the server. Never trust the form or the browser. */
export const uuid = z.uuid();

export const applicationIdInput = z.object({ applicationId: uuid });

export const employerStatusInput = z.object({
  applicationId: uuid,
  status: z.enum(EMPLOYER_SETTABLE, { error: "Choose a valid status." }),
});

export const verificationDecisionInput = z.object({
  verificationId: uuid,
  decision: z.enum(VERIFICATION_DECISIONS, { error: "Invalid decision." }),
});

export const moderationDecisionInput = z.object({
  jobId: uuid,
  decision: z.enum(MODERATION_DECISIONS, { error: "Invalid decision." }),
  /** The listing version the moderator reviewed (migration 009). Optional so the screen also works before 009 is applied. */
  reviewedVersion: z.number().int().min(1).optional(),
});

export const reportDecisionInput = z.object({
  reportId: uuid,
  decision: z.enum(REPORT_DECISIONS, { error: "Invalid decision." }),
});

export const isApplicationStatus = (v: unknown): v is ApplicationStatus => (APPLICATION_STATUSES as readonly string[]).includes(v as string);
