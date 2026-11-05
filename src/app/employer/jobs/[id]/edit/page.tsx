import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { JobForm, type JobFormDefaults } from "@/components/features/JobForm";
import { PageHeader } from "@/components/ui/Misc";
import { saveJobAction } from "@/lib/stage-e/job-actions";
import { getMyJob, listCategories } from "@/lib/stage-e/job-queries";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const [job, categories] = await Promise.all([getMyJob(id), listCategories()]);
  if (!job) notFound(); // RLS hides other employers' listings, so this is also the ownership check.

  const initial: JobFormDefaults = {
    title: job.title,
    summary: job.summary,
    responsibilities: job.responsibilities.join("\n"),
    requirements: job.requirements.join("\n"),
    perks: job.perks.join("\n"),
    type: job.type,
    workMode: job.work_mode,
    employment: job.employment,
    level: job.level,
    location: job.location,
    categoryId: job.category_id ? String(job.category_id) : "",
    isPaid: job.is_paid,
    payMin: job.pay_min != null ? String(Number(job.pay_min)) : "",
    payMax: job.pay_max != null ? String(Number(job.pay_max)) : "",
    payPeriod: job.pay_period ?? "month",
    deadline: job.application_deadline ? new Date(job.application_deadline).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "",
  };

  return (
    <>
      <PageHeader title="Edit role" text="Changes are saved to the live record. Edits to a live listing are not re-reviewed automatically (see the Stage E2 report)." />
      <div className="max-w-3xl">
        <JobForm jobId={job.id} categories={categories} initial={initial} status={job.status} save={saveJobAction} />
      </div>
    </>
  );
}
