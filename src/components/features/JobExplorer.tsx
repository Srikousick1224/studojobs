"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, SearchX } from "lucide-react";
import type { Job, JobType, Level, WorkMode } from "@/lib/types";
import { getCompany } from "@/lib/data";
import { Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { JobCard } from "./JobCard";

function monthlyEquivalent(job: Job) {
  if (!job.isPaid || !job.stipend) return 0;
  const { max, period } = job.stipend;
  return period === "year" ? max / 12 : max;
}

interface Props {
  jobs: Job[];
  initialQuery?: string;
  /** When set, the type filter is fixed (used on the Internships page). */
  lockType?: JobType;
}

export function JobExplorer({ jobs, initialQuery = "", lockType }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState<JobType | "all">(lockType ?? "all");
  const [mode, setMode] = useState<WorkMode | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [paidOnly, setPaidOnly] = useState(false);
  const [sort, setSort] = useState<"newest" | "pay">("newest");
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = jobs.filter((j) => {
      if (type !== "all" && j.type !== type) return false;
      if (mode !== "all" && j.workMode !== mode) return false;
      if (level !== "all" && j.level !== level) return false;
      if (paidOnly && !j.isPaid) return false;
      if (!term) return true;
      const company = getCompany(j.companySlug)?.name ?? "";
      return [j.title, company, j.location, ...j.skills].join(" ").toLowerCase().includes(term);
    });
    return [...list].sort((a, b) =>
      sort === "newest" ? a.postedDaysAgo - b.postedDaysAgo : monthlyEquivalent(b) - monthlyEquivalent(a),
    );
  }, [jobs, q, type, mode, level, paidOnly, sort]);

  const activeCount = [type !== "all" && !lockType, mode !== "all", level !== "all", paidOnly].filter(Boolean).length;

  function reset() {
    setQ("");
    setType(lockType ?? "all");
    setMode("all");
    setLevel("all");
    setPaidOnly(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div>
        <div className="flex gap-2 lg:hidden">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Role, skill or company"
              aria-label="Search opportunities"
              className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-sm ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <Button variant="secondary" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-controls="filters">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters{activeCount > 0 && ` (${activeCount})`}
          </Button>
        </div>

        <form
          id="filters"
          onSubmit={(e) => e.preventDefault()}
          className={`${showFilters ? "block" : "hidden"} mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100 lg:sticky lg:top-24 lg:mt-0 lg:block`}
        >
          <div className="hidden lg:block">
            <Input id="search" label="Search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Role, skill or company" />
          </div>
          {!lockType && (
            <Select id="type" label="Type" value={type} onChange={(e) => setType(e.target.value as JobType | "all")}>
              <option value="all">All types</option>
              <option value="job">Jobs</option>
              <option value="internship">Internships</option>
              <option value="freelance">Freelance</option>
            </Select>
          )}
          <Select id="mode" label="Work mode" value={mode} onChange={(e) => setMode(e.target.value as WorkMode | "all")}>
            <option value="all">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </Select>
          <Select id="level" label="Experience level" value={level} onChange={(e) => setLevel(e.target.value as Level | "all")}>
            <option value="all">Any</option>
            <option value="internship">Internship</option>
            <option value="entry">Entry-level</option>
            <option value="graduate">Graduate</option>
            <option value="junior">Junior</option>
          </Select>
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink-800">
            <input type="checkbox" checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} className="h-4.5 w-4.5 rounded accent-brand-500" />
            Paid opportunities only
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="w-full">
            Clear all
          </Button>
        </form>
      </div>

      <section aria-label="Results">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink-600" aria-live="polite">
            {results.length} {results.length === 1 ? "opportunity" : "opportunities"}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sort" className="font-medium text-ink-500">Sort by</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "pay")}
              className="h-10 rounded-lg bg-white px-3 text-sm font-semibold ring-1 ring-ink-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="pay">Highest pay</option>
            </select>
          </div>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches yet"
            text="Try removing a filter or searching a broader skill like “Python” or “design”."
            action={<Button variant="secondary" onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <div className="stagger-grid grid gap-4 xl:grid-cols-2">
            {results.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
