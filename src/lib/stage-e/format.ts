import { formatMoney } from "@/lib/utils";

const DAY_MS = 86_400_000;

/** Whole days between an ISO timestamp and `now`. Never negative. */
export function daysSince(iso: string, now: number = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

const PERIOD: Record<string, string> = { month: "month", year: "year", project: "project" };

/** Human pay text. Unpaid roles are labelled as unpaid, never left blank. */
export function payLabel(job: {
  is_paid: boolean;
  pay_min: number | string | null;
  pay_max: number | string | null;
  pay_period: string | null;
  pay_currency: string;
}): string {
  if (!job.is_paid) return "Unpaid";
  const min = Number(job.pay_min);
  const max = Number(job.pay_max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !job.pay_period) return "Paid (amount not stated)";
  const period = PERIOD[job.pay_period] ?? job.pay_period;
  return `${formatMoney(min, job.pay_currency)} – ${formatMoney(max, job.pay_currency)} / ${period}`;
}

const REASON: Record<string, string> = {
  asks_for_money: "Asks for money",
  fake_company: "Fake company",
  misleading_details: "Misleading details",
  sensitive_documents: "Asks for sensitive documents",
  abusive_content: "Abusive content",
  other: "Other",
};
export function reasonLabel(reason: string): string {
  return REASON[reason] ?? "Other";
}

const WORK_MODE: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const JOB_TYPE: Record<string, string> = { job: "Job", internship: "Internship", freelance: "Freelance" };
export const workModeLabel = (v: string) => WORK_MODE[v] ?? v;
export const jobTypeLabel = (v: string) => JOB_TYPE[v] ?? v;
