import { z } from "zod";

/** Reasons accepted by the database CHECK on reports.reason (see migration 002). */
export const LISTING_REPORT_REASONS = {
  asks_for_money: "Asks for money or a fee",
  fake_company: "Fake company or impersonation",
  misleading_details: "Misleading pay or role details",
  sensitive_documents: "Asks for sensitive documents too early",
  abusive_content: "Discriminatory or abusive content",
  other: "Something else",
} as const;

export const listingReportInput = z.object({
  jobId: z.uuid({ message: "Choose the listing you want to report." }),
  reason: z.enum(Object.keys(LISTING_REPORT_REASONS) as [keyof typeof LISTING_REPORT_REASONS, ...(keyof typeof LISTING_REPORT_REASONS)[]], { message: "Choose the closest reason." }),
  details: z.string().trim().min(20, "Please describe what happened (at least 20 characters).").max(2000, "Details can be at most 2000 characters."),
});

/** Report a whole company (for example an impersonation or a pattern of scam listings), not one listing. Same reasons and limits. */
export const companyReportInput = listingReportInput.omit({ jobId: true }).extend({
  companyId: z.uuid({ message: "Choose the company you want to report." }),
});
