import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Flag, Globe, MapPin, Users } from "lucide-react";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { Avatar, Notice } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { getSaveState } from "@/lib/saved/queries";
import { getPublicCompany } from "@/lib/stage-e/job-queries";
import { hueFromName } from "@/lib/stage-e/job-view";

export const metadata: Metadata = { title: "Company" };

/** Only http(s) links are shown, so a stored "javascript:" value can never become a clickable link. */
const safeUrl = (v: string | null) => (v && /^https?:\/\//i.test(v) ? v : null);

async function Body({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const { company, jobs, error } = await getPublicCompany(slug);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!company) notFound();
  const save = await getSaveState(jobs.map((j) => j.id));
  const site = safeUrl(company.website);

  return (
    <>
      <header className="flex flex-wrap items-center gap-5">
        <Avatar name={company.name} hue={hueFromName(company.name)} size={80} />
        <div>
          <h1 className="text-3xl font-extrabold">{company.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
            {company.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{company.location}</span>}
            {company.sizeRange && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />{company.sizeRange} people</span>}
            {site && <a href={site} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"><Globe className="h-4 w-4" aria-hidden="true" />Website</a>}
            {company.industry && <Badge>{company.industry}</Badge>}
            {company.verified ? <Badge tone="mint"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified</Badge> : <Badge tone="amber">Not verified</Badge>}
          </p>
        </div>
      </header>
      {!company.verified && <Notice tone="warn">This company has not been verified yet. Be careful with personal information, and never pay to apply.</Notice>}
      {company.about && (
        <section>
          <h2 className="text-xl font-bold">About</h2>
          <p className="mt-2 max-w-3xl whitespace-pre-line leading-relaxed text-ink-700">{company.about}</p>
        </section>
      )}
      <section>
        <h2 className="text-xl font-bold">Open roles ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No open roles right now. Check back soon.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {jobs.map((j) => <LiveJobCard key={j.id} job={j} saveMode={save.mode} saved={save.saved.has(j.id)} />)}
          </div>
        )}
      </section>
      <p className="border-t border-ink-100 pt-4">
        <Link href={`/report?company=${encodeURIComponent(company.slug)}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-rose-600">
          <Flag className="h-4 w-4" aria-hidden="true" /> Report this company
        </Link>
      </p>
    </>
  );
}

export default function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-ink-100" aria-label="Loading company" />}>
        <Body params={params} />
      </Suspense>
    </div>
  );
}
