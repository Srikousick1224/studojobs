export type JobType = "job" | "internship" | "freelance";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type Employment = "full-time" | "part-time" | "contract";
export type Level = "internship" | "entry" | "graduate" | "junior";

export interface Company {
  slug: string;
  name: string;
  industry: string;
  size: string;
  location: string;
  about: string;
  verified: boolean;
  /** 0–360, used to colour the monogram avatar */
  hue: number;
}

export interface Stipend {
  min: number;
  max: number;
  period: "month" | "year" | "project";
}

export interface Job {
  id: string;
  companySlug: string;
  title: string;
  type: JobType;
  workMode: WorkMode;
  employment: Employment;
  level: Level;
  location: string;
  isPaid: boolean;
  stipend?: Stipend;
  skills: string[];
  postedDaysAgo: number;
  deadlineInDays: number;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  perks: string[];
}

export type ApplicationStatus =
  | "applied"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offer"
  | "rejected";

export interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedDaysAgo: number;
  note?: string;
}

export interface Resource {
  id: string;
  title: string;
  category: "Resume" | "Interview" | "Skills" | "Career";
  minutes: number;
  summary: string;
}
