import { connection } from "next/server";
import type { Metadata } from "next";
import { ActionButton } from "@/components/features/ActionButton";
import { ApplicationStatusBadge } from "@/components/features/ApplicationStatusBadge";
import { Card } from "@/components/ui/Card";
import { Avatar, EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { Users } from "lucide-react";
import { employerSetApplicationStatusAction } from "@/lib/stage-e/actions";
import { getResumeLinkAction } from "@/lib/stage-e/job-actions";
import { ResumeLinkButton } from "@/components/features/ResumeLinkButton";
import { daysSince } from "@/lib/stage-e/format";
import { listEmployerApplications } from "@/lib/stage-e/queries";
import { employerNextStatuses, type ApplicationStatus } from "@/lib/stage-e/status";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Applicants" };

const ACTION_LABEL: Partial<Record<ApplicationStatus, string>> = {
  under_review: "Mark in review",
  shortlisted: "Shortlist",
  selected: "Select",
  rejected: "Not selected",
};

export default async function ApplicantsPage() {
  await connection();
  const { rows, error } = await listEmployerApplications();

  return (
    <>
      <PageHeader title="Applicants" text="Review candidates for your roles and move them through your pipeline." />
      {error && <Notice tone="error">{error}</Notice>}
      {!error && rows.length === 0 && (
        <EmptyState icon={Users} title="No applicants yet" text="When students apply to your published roles, they will appear here." />
      )}
      <div className="space-y-4">
        {rows.map((a) => {
          const education = [a.college, a.degree, a.graduationYear ? `Class of ${a.graduationYear}` : null].filter(Boolean).join(" · ");
          return (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start gap-4">
                <Avatar name={a.studentName} />
                <div className="min-w-0 flex-1 basis-64">
                  <p className="font-bold">{a.studentName}</p>
                  <p className="text-sm text-ink-600">{a.headline || "No headline added"}</p>
                  {education && <p className="mt-0.5 text-xs text-ink-500">{education}</p>}
                  <p className="mt-2 text-xs text-ink-500">
                    Applied for <span className="font-semibold text-ink-700">{a.jobTitle}</span> · {timeAgo(daysSince(a.appliedAt)).toLowerCase()}
                  </p>
                  {a.resumeLabel && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <span>Resume: {a.resumeLabel}{a.resumeFile ? ` (${a.resumeFile})` : ""}</span>
                      {a.resumeId && <ResumeLinkButton resumeId={a.resumeId} getLink={getResumeLinkAction} />}
                    </div>
                  )}
                  {a.coverNote && <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">{a.coverNote}</p>}
                </div>
                <div className="flex flex-col items-end gap-3">
                  <ApplicationStatusBadge status={a.status} />
                  <div className="flex flex-wrap justify-end gap-2">
                    {employerNextStatuses(a.status).map((s) => (
                      <ActionButton
                        key={s}
                        action={employerSetApplicationStatusAction}
                        payload={{ applicationId: a.id, status: s }}
                        label={ACTION_LABEL[s] ?? s}
                        variant={s === "selected" ? "mint" : "secondary"}
                        confirm={s === "rejected" ? "Mark this candidate as not selected?" : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
