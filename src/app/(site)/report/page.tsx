import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ReportForm } from "@/components/features/ReportForm";
import { Notice, PageHeader } from "@/components/ui/Misc";
import { getViewer } from "@/lib/auth/dal";
import { getPublicCompany, getPublicJob } from "@/lib/stage-e/job-queries";

export const metadata: Metadata = { title: "Report to StudoJob" };

type Search = Promise<{ job?: string; company?: string }>;

async function Form({ searchParams }: { searchParams: Search }) {
  await connection();
  const { job: jobId, company: companySlug } = await searchParams;
  if (companySlug && !jobId) {
    const { company } = await getPublicCompany(companySlug);
    if (!company) return <Notice>We could not find that company. You can start from <Link href="/companies" className="font-semibold text-brand-700 underline">the company list</Link>.</Notice>;
    const viewerForCompany = await getViewer();
    return (
      <div className="space-y-5">
        <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700 ring-1 ring-ink-100">
          You are reporting the company: <Link href={`/companies/${company.slug}`} className="font-bold text-brand-700 hover:underline">{company.name}</Link>
        </p>
        {viewerForCompany ? (
          <ReportForm companyId={company.id} />
        ) : (
          <Notice>
            Please <Link href={`/login?next=${encodeURIComponent(`/report?company=${company.slug}`)}`} className="font-semibold text-brand-700 underline">sign in</Link> to send a report. This helps us stop spam reports.
          </Notice>
        )}
      </div>
    );
  }
  const { job } = jobId ? await getPublicJob(jobId) : { job: null };
  if (!job) {
    return (
      <Notice>
        Open the listing you want to report and choose <strong>Report listing</strong>. You can start from <Link href="/jobs" className="font-semibold text-brand-700 underline">the job list</Link>.
      </Notice>
    );
  }
  const viewer = await getViewer();
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-700 ring-1 ring-ink-100">
        You are reporting: <Link href={`/jobs/${job.id}`} className="font-bold text-brand-700 hover:underline">{job.title}</Link> at {job.companyName}
      </p>
      {viewer ? (
        <ReportForm jobId={job.id} />
      ) : (
        <Notice>
          Please <Link href={`/login?next=${encodeURIComponent(`/report?job=${job.id}`)}`} className="font-semibold text-brand-700 underline">sign in</Link> to send a report. This helps us stop spam reports.
        </Notice>
      )}
    </div>
  );
}

export default function ReportPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <PageHeader title="Report a listing or company" text="Help keep StudoJob safe. Reports go to our review team. Real employers never ask you to pay to get a job." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink-100" aria-label="Loading form" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
