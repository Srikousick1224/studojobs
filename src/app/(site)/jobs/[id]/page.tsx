import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, Flag, MapPin, Wallet } from "lucide-react";
import { ApplyForm } from "@/components/features/ApplyForm";
import { ApplicationStatusBadge } from "@/components/features/ApplicationStatusBadge";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { SaveButton } from "@/components/features/SaveButton";
import { Avatar, Notice } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getViewer } from "@/lib/auth/dal";
import { applyToJobAction } from "@/lib/stage-e/job-actions";
import { daysSince, jobTypeLabel, workModeLabel } from "@/lib/stage-e/format";
import { getMyApplicationFor, getPublicJob, listMyResumes, searchPublicJobs } from "@/lib/stage-e/job-queries";
import { hueFromName } from "@/lib/stage-e/job-view";
import { isApplicationStatus, } from "@/lib/stage-e/schemas";
import { timeAgo } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { job } = await getPublicJob(id);
  return { title: job ? `${job.title} at ${job.companyName}` : "Opportunity not found" };
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-ink-700">
        {items.map((i) => (
          <li key={i} className="flex gap-3 leading-relaxed">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
            {i}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ApplyArea({ jobId, viewer, existing, resumes }: {
  jobId: string;
  viewer: Awaited<ReturnType<typeof getViewer>>;
  existing: { id: string; status: string } | null;
  resumes: { id: string; label: string; file_name: string }[];
}) {
  if (!viewer) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`} className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-brand-500 px-7 font-semibold text-white hover:bg-brand-600">
        Log in to apply
      </Link>
    );
  }
  if (viewer.isSuspended || !viewer.onboarded) return <Notice>Finish setting up your account to apply.</Notice>;
  if (viewer.role !== "student") return <Notice>Students apply from a student account.</Notice>;
  if (existing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-600">You have already applied to this role.</p>
        {isApplicationStatus(existing.status) && <ApplicationStatusBadge status={existing.status} />}
        <Link href="/student/applications" className="block text-sm font-semibold text-brand-600 hover:underline">Track it in My applications →</Link>
      </div>
    );
  }
  return <ApplyForm jobId={jobId} resumes={resumes} apply={applyToJobAction} />;
}

async function JobBody({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const { job, error } = await getPublicJob(id);
  if (error) return <div className="mx-auto max-w-7xl px-4 py-10"><Notice tone="error">{error}</Notice></div>;
  if (!job) notFound();

  const viewer = await getViewer();
  const isStudent = viewer?.role === "student" && !viewer.isSuspended && viewer.onboarded;
  const [resumes, existing, similar] = await Promise.all([
    isStudent ? listMyResumes() : Promise.resolve([]),
    isStudent ? getMyApplicationFor(job.id) : Promise.resolve(null),
    job.categoryId ? searchPublicJobs({ category: String(job.categoryId) }) : Promise.resolve({ rows: [], total: 0, error: null }),
  ]);
  const relatedJobs = similar.rows.filter((j) => j.id !== job.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-500">
        <Link href="/jobs" className="hover:text-brand-600">Jobs</Link> / <span className="text-ink-800">{job.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <div className="flex items-start gap-5">
            <Avatar name={job.companyName} hue={hueFromName(job.companyName)} size={64} />
            <div>
              <h1 className="text-3xl font-extrabold sm:text-4xl">{job.title}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-ink-600">
                <span className="font-semibold">{job.companyName}</span>
                {job.companyVerified ? (
                  <Badge tone="mint"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified</Badge>
                ) : (
                  <Badge tone="amber">Not yet verified</Badge>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{jobTypeLabel(job.type)}</Badge>
            <Badge>{workModeLabel(job.workMode)}</Badge>
            <Badge>{job.employment.replace("_", "-")}</Badge>
            <Badge>{job.level} level</Badge>
            {!job.isPaid && <Badge tone="amber">Unpaid</Badge>}
          </div>

          {!job.isPaid && (
            <Notice tone="warn">This is an <strong>unpaid</strong> opportunity. Check what you will receive in return (mentoring, certificate, references) before you apply.</Notice>
          )}
          {!job.companyVerified && (
            <Notice tone="warn">This employer has not completed verification. Never pay a fee, buy equipment, or share bank details to get a job.</Notice>
          )}

          <section>
            <h2 className="text-xl font-bold">About the role</h2>
            <p className="mt-3 leading-relaxed text-ink-700">{job.summary}</p>
          </section>
          <Section title="What you will do" items={job.responsibilities} />
          <Section title="What we are looking for" items={job.requirements} />
          <Section title="What you get" items={job.perks} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-5 p-6">
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2.5"><Wallet className="h-5 w-5 text-brand-600" aria-hidden="true" /><span className="font-bold text-ink-900">{job.payText}</span></p>
              <p className="flex items-center gap-2.5 text-ink-600"><MapPin className="h-5 w-5 text-brand-600" aria-hidden="true" />{job.location}</p>
              {job.deadline && (
                <p className="flex items-center gap-2.5 text-ink-600">
                  <CalendarClock className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  Apply by {new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                </p>
              )}
              {job.publishedAt && <p className="text-ink-500">Posted {timeAgo(daysSince(job.publishedAt)).toLowerCase()}</p>}
            </div>
            <ApplyArea jobId={job.id} viewer={viewer} existing={existing} resumes={resumes} />
            <div className="flex items-center justify-between border-t border-ink-100 pt-4">
              <SaveButton jobId={job.id} withLabel />
              <Link href={`/report?job=${job.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-rose-600">
                <Flag className="h-4 w-4" aria-hidden="true" /> Report listing
              </Link>
            </div>
          </Card>
        </aside>
      </div>

      {relatedJobs.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-extrabold">Similar opportunities</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {relatedJobs.map((j) => <LiveJobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}
    </div>
  );
}

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10"><div className="h-96 animate-pulse rounded-2xl bg-ink-100" aria-label="Loading opportunity" /></div>}>
      <JobBody params={params} />
    </Suspense>
  );
}
