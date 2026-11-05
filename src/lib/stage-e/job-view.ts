/** Shape the public job cards and detail pages use. Built from real rows only. */
export interface JobListItem {
  id: string;
  title: string;
  summary: string;
  type: "job" | "internship" | "freelance";
  workMode: "remote" | "hybrid" | "onsite";
  employment: "full_time" | "part_time" | "contract";
  level: "internship" | "entry" | "graduate" | "junior";
  location: string;
  isPaid: boolean;
  payText: string;
  publishedAt: string | null;
  deadline: string | null;
  companyName: string;
  companySlug: string;
  companyVerified: boolean;
  categoryName: string | null;
}

/** Stable colour for a monogram, derived from the name (companies have no stored hue yet). */
export function hueFromName(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Escapes LIKE wildcards so a search for "50%" is literal text. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
