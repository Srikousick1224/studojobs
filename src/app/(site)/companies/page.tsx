import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { Avatar, EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { hueFromName } from "@/lib/stage-e/job-view";
import { listPublicCompanies } from "@/lib/stage-e/job-queries";

export const metadata: Metadata = { title: "Companies hiring beginners" };

async function List() {
  await connection();
  const { rows, error } = await listPublicCompanies();
  if (error) return <Notice tone="error">{error}</Notice>;
  if (rows.length === 0) return <EmptyState icon={Building2} title="No companies yet" text="Verified employers appear here as soon as they register." />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((c) => (
        <article key={c.id} className="group relative rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200">
          <div className="flex items-center gap-4">
            <Avatar name={c.name} hue={hueFromName(c.name)} size={52} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">
                <Link href={`/companies/${c.slug}`} className="after:absolute after:inset-0 after:rounded-2xl">{c.name}</Link>
              </h2>
              {c.location && <p className="flex items-center gap-1 text-sm text-ink-500"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{c.location}</p>}
            </div>
          </div>
          {c.about && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-600">{c.about}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {c.industry && <Badge>{c.industry}</Badge>}
            {c.verified ? <Badge tone="mint"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified</Badge> : <Badge tone="amber">Not verified</Badge>}
            <span className="ml-auto text-sm font-semibold text-brand-600">{c.openRoles} open {c.openRoles === 1 ? "role" : "roles"}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title="Companies hiring beginners" text="Explore employers, see what they do, and check whether they are verified." />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-ink-100" aria-label="Loading companies" />}>
        <List />
      </Suspense>
    </div>
  );
}
