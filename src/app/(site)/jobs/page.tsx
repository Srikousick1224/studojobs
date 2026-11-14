import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { listCategories, PAGE_SIZE, searchPublicJobs } from "@/lib/stage-e/job-queries";
import { getSaveState } from "@/lib/saved/queries";

export const metadata: Metadata = { title: "Find jobs and internships" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const params = await searchParams;
  const page = Math.max(1, parseInt(one(params.page), 10) || 1);
  const filters = {
    q: one(params.q),
    type: one(params.type),
    mode: one(params.mode),
    level: one(params.level),
    location: one(params.location),
    category: one(params.category),
    paid: one(params.paid) === "1",
  };
  const [{ rows, total, error }, categories] = await Promise.all([searchPublicJobs({ ...filters, page }), listCategories()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const save = await getSaveState(rows.map((r) => r.id));

  const queryFor = (p: number) => {
    const sp = new URLSearchParams();
    const pairs: [string, string][] = [["q", filters.q], ["type", filters.type], ["mode", filters.mode], ["level", filters.level], ["location", filters.location], ["category", filters.category]];
    for (const [k, v] of pairs) if (v) sp.set(k, v);
    if (filters.paid) sp.set("paid", "1");
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/jobs?${s}` : "/jobs";
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <form action="/jobs" method="GET" className="space-y-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100 lg:sticky lg:top-24 lg:self-start">
        <Input id="q" name="q" label="Search" type="search" defaultValue={filters.q} placeholder="Role, skill or company" />
        <Select id="type" name="type" label="Type" defaultValue={filters.type}>
          <option value="">All types</option>
          <option value="job">Jobs</option>
          <option value="internship">Internships</option>
          <option value="freelance">Freelance</option>
        </Select>
        <Select id="mode" name="mode" label="Work mode" defaultValue={filters.mode}>
          <option value="">Any</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </Select>
        <Select id="level" name="level" label="Experience level" defaultValue={filters.level}>
          <option value="">Any</option>
          <option value="internship">Internship</option>
          <option value="entry">Entry-level</option>
          <option value="graduate">Graduate</option>
          <option value="junior">Junior</option>
        </Select>
        <Select id="category" name="category" label="Category" defaultValue={filters.category}>
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </Select>
        <Input id="location" name="location" label="Location" defaultValue={filters.location} placeholder="e.g. Chennai" />
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink-800">
          <input type="checkbox" name="paid" value="1" defaultChecked={filters.paid} className="h-4.5 w-4.5 rounded accent-brand-500" />
          Paid opportunities only
        </label>
        <Button type="submit" className="w-full">Apply filters</Button>
        <Link href="/jobs" className="block text-center text-sm font-semibold text-ink-500 hover:text-brand-600">Clear all</Link>
      </form>

      <section aria-label="Results">
        {error && <Notice tone="error">{error}</Notice>}
        {!error && (
          <p className="mb-4 text-sm font-semibold text-ink-600" aria-live="polite">
            {total} {total === 1 ? "opportunity" : "opportunities"}
          </p>
        )}
        {!error && rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={total === 0 && !Object.values(filters).some(Boolean) ? "No opportunities published yet" : "Nothing matches yet"}
            text="Try removing a filter or searching a broader skill like “Python” or “design”."
            action={<Link href="/jobs" className="text-sm font-semibold text-brand-600 hover:underline">Clear filters</Link>}
          />
        )}
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((j) => (
            <LiveJobCard key={j.id} job={j} saveMode={save.mode} saved={save.saved.has(j.id)} />
          ))}
        </div>
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={queryFor(page - 1)} className="font-semibold text-brand-600 hover:underline">← Previous</Link> : <span />}
            <span className="text-ink-500">Page {page} of {pages}</span>
            {page < pages ? <Link href={queryFor(page + 1)} className="font-semibold text-brand-600 hover:underline">Next →</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}

export default function JobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title="Find your next opportunity" text="Search jobs, internships and freelance work. Filter by work mode, level and pay." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink-100" aria-label="Loading opportunities" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
