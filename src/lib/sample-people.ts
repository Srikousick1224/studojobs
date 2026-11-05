/** PHASE 1 SAMPLE DATA — all names are fictional. */
import type { ApplicationStatus } from "./types";

export interface Applicant {
  id: string;
  name: string;
  college: string;
  jobId: string;
  status: ApplicationStatus;
  skills: string[];
  appliedDaysAgo: number;
}

export const applicants: Applicant[] = [
  { id: "p-1", name: "Meera Krishnan", college: "Anna Demo University", jobId: "j-101", status: "shortlisted", skills: ["SQL", "Python", "Power BI"], appliedDaysAgo: 1 },
  { id: "p-2", name: "Rohan Desai", college: "Westbridge Institute", jobId: "j-101", status: "reviewing", skills: ["Excel", "SQL"], appliedDaysAgo: 2 },
  { id: "p-3", name: "Aisha Khan", college: "Northfield College", jobId: "j-101", status: "interview", skills: ["Python", "Statistics"], appliedDaysAgo: 4 },
  { id: "p-4", name: "Vikram Nair", college: "Lakeshore University", jobId: "j-107", status: "applied", skills: ["Power BI", "DAX"], appliedDaysAgo: 0 },
  { id: "p-5", name: "Sneha Iyer", college: "Anna Demo University", jobId: "j-107", status: "reviewing", skills: ["Power BI", "SQL"], appliedDaysAgo: 3 },
  { id: "p-6", name: "Arjun Mehta", college: "Westbridge Institute", jobId: "j-101", status: "rejected", skills: ["Excel"], appliedDaysAgo: 6 },
  { id: "p-7", name: "Priya Raman", college: "Northfield College", jobId: "j-107", status: "shortlisted", skills: ["DAX", "SQL", "Python"], appliedDaysAgo: 2 },
];

export interface ModerationItem {
  id: string;
  kind: "Listing" | "Employer" | "Report";
  title: string;
  detail: string;
  daysAgo: number;
  flag?: string;
}

export const moderationQueue: ModerationItem[] = [
  { id: "m-1", kind: "Employer", title: "Tidal Finance", detail: "Domain email not yet confirmed. Registration documents uploaded.", daysAgo: 1, flag: "Needs domain check" },
  { id: "m-2", kind: "Listing", title: "Customer Support Associate — Tidal Finance", detail: "Posted by an unverified employer. Auto-held for review.", daysAgo: 2 },
  { id: "m-3", kind: "Report", title: "“Asks for a registration fee”", detail: "Reported by a student on a sample listing. Reason: asks for money or a fee.", daysAgo: 0, flag: "High priority" },
  { id: "m-4", kind: "Listing", title: "Marketing Trainee — Example Corp", detail: "Stipend field says “₹50,000 per day”. Possible typo or misleading pay.", daysAgo: 1, flag: "Pay looks unusual" },
];

export const platformWeeks = [
  { label: "W1", value: 12 },
  { label: "W2", value: 19 },
  { label: "W3", value: 16 },
  { label: "W4", value: 27 },
  { label: "W5", value: 31 },
];

export const employerWeeks = [
  { label: "Mon", value: 4 },
  { label: "Tue", value: 9 },
  { label: "Wed", value: 6 },
  { label: "Thu", value: 12 },
  { label: "Fri", value: 8 },
];
