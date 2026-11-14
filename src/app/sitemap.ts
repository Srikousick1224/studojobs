import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { listPublicCompanies, PAGE_SIZE, searchPublicJobs } from "@/lib/stage-e/job-queries";

const STATIC = ["", "/jobs", "/internships", "/companies", "/community", "/resources", "/about", "/safety", "/help", "/contact", "/privacy", "/terms"];

/** Static pages plus every published job and company. Built per request so new listings appear without a redeploy. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = getSiteUrl();
  const entries: MetadataRoute.Sitemap = STATIC.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const }));
  const [first, companies] = await Promise.all([searchPublicJobs({ page: 1 }), listPublicCompanies()]);
  // Up to 10 pages (PAGE_SIZE each). Beyond that, move to a sitemap index (tracked as a later task).
  const pages = Math.min(10, Math.ceil(first.total / PAGE_SIZE));
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => searchPublicJobs({ page: i + 2 })));
  const jobs = { rows: [first, ...rest].flatMap((r) => r.rows) };
  for (const j of jobs.rows) entries.push({ url: `${base}/jobs/${j.id}`, lastModified: j.publishedAt ?? undefined });
  for (const c of companies.rows) entries.push({ url: `${base}/companies/${c.slug}` });
  return entries;
}
