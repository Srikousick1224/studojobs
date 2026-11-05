import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportForm } from "@/components/features/ReportForm";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Report a listing" };

async function Form({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  return <ReportForm defaultJobId={job} />;
}

export default function ReportPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <PageHeader title="Report a listing" text="Help keep StudoJob safe. Reports go to our review team. Real employers never ask you to pay to get a job." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink-100" aria-label="Loading form" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
