import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Briefcase } from "lucide-react";
import { ActionButton } from "@/components/features/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { setMyJobStatusAction } from "@/lib/stage-e/job-actions";
import { jobTypeLabel } from "@/lib/stage-e/format";
import { getMyCompany, listMyJobs } from "@/lib/stage-e/job-queries";

export const metadata: Metadata = { title: "My jobs" };

const STATUS: Record<string, { label: string; tone: "neutral" | "brand" | "mint" | "amber" | "rose" | "sky" }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "Waiting for review", tone: "amber" },
  published: { label: "Live", tone: "mint" },
  paused: { label: "Paused", tone: "sky" },
  closed: { label: "Closed", tone: "neutral" },
  rejected: { label: "Not approved", tone: "rose" },
};

export default async function MyJobsPage() {
  await connection();
  const [company, { rows, error }] = await Promise.all([getMyCompany(), listMyJobs()]);

  return (
    <>
      <PageHeader
        title="My jobs"
        text="Every role you have created. Only your own listings appear here."
        action={company ? <Button href="/employer/jobs/new">Post a role</Button> : undefined}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {!company && !error && (
        <EmptyState
          icon={Briefcase}
          title="Create your company first"
          text="A company profile is needed before you can post a role."
          action={<Button href="/employer/company">Set up company</Button>}
        />
      )}
      {company && !error && rows.length === 0 && (
        <EmptyState icon={Briefcase} title="No roles yet" text="Create a draft or publish your first role. Drafts are only visible to you." action={<Button href="/employer/jobs/new">Post a role</Button>} />
      )}
      <div className="space-y-4">
        {rows.map((j) => {
          const s = STATUS[j.status] ?? { label: j.status, tone: "neutral" as const };
          return (
            <Card key={j.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={s.tone}>{s.label}</Badge>
                  <Badge>{jobTypeLabel(j.type)}</Badge>
                </div>
                <p className="mt-2 font-bold">{j.title}</p>
                <p className="mt-0.5 text-sm text-ink-600">
                  {j.location} · {j.applicants} {j.applicants === 1 ? "applicant" : "applicants"}
                  {j.application_deadline && ` · closes ${new Date(j.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`}
                </p>
                {j.status === "rejected" && j.moderation_note && <p className="mt-2 text-sm text-rose-700">{j.moderation_note}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/employer/jobs/${j.id}/edit`} className="inline-flex h-9 items-center rounded-xl bg-white px-3.5 text-sm font-semibold text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50">
                  Edit
                </Link>
                {j.status === "published" && (
                  <ActionButton action={setMyJobStatusAction} payload={{ jobId: j.id, status: "paused" }} label="Pause" />
                )}
                {j.status === "paused" && (
                  <ActionButton action={setMyJobStatusAction} payload={{ jobId: j.id, status: "published" }} label="Resume" variant="mint" />
                )}
                {(j.status === "published" || j.status === "paused") && (
                  <ActionButton action={setMyJobStatusAction} payload={{ jobId: j.id, status: "closed" }} label="Close" variant="danger" confirm="Close this listing? Students will no longer be able to apply." />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
