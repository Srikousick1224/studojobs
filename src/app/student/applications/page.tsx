import { connection } from "next/server";
import type { Metadata } from "next";
import { Send } from "lucide-react";
import { CalendarClock, MapPin, Phone, Video } from "lucide-react";
import { LocalTime } from "@/components/features/LocalTime";
import { listUpcomingInterviews } from "@/lib/stage-e/interview-queries";
import { INTERVIEW_MODE_LABEL } from "@/lib/stage-e/interview-schema";
import { ActionButton } from "@/components/features/ActionButton";
import { ApplicationStatusBadge } from "@/components/features/ApplicationStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar, EmptyState, Notice, PageHeader } from "@/components/ui/Misc";
import { withdrawApplicationAction } from "@/lib/stage-e/actions";
import { daysSince, jobTypeLabel, payLabel, workModeLabel } from "@/lib/stage-e/format";
import { listStudentApplications } from "@/lib/stage-e/queries";
import { APPLICATION_STAGES, canStudentWithdraw } from "@/lib/stage-e/status";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "My applications" };

export default async function ApplicationsPage() {
  await connection();
  const [{ rows, error }, interviews] = await Promise.all([listStudentApplications(), listUpcomingInterviews()]);

  return (
    <>
      <PageHeader title="My applications" text="Track every application from submission to offer." />
      {error && <Notice tone="error">{error}</Notice>}
      {!error && rows.length === 0 && (
        <EmptyState
          icon={Send}
          title="No applications yet"
          text="Applications you send will appear here with their progress."
          action={<Button href="/jobs">Browse opportunities</Button>}
        />
      )}
      <div className="space-y-4">
        {rows.map((a) => {
          const job = a.jobs;
          const companyName = job?.companies?.name ?? "Company unavailable";
          const stageIndex = APPLICATION_STAGES.indexOf(a.status);
          return (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={companyName} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{job?.title ?? "Listing unavailable"}</p>
                  <p className="text-sm text-ink-500">
                    {companyName} · applied {timeAgo(daysSince(a.applied_at)).toLowerCase()}
                  </p>
                  {job && (
                    <p className="mt-1 text-xs text-ink-500">
                      {jobTypeLabel(job.type)} · {workModeLabel(job.work_mode)} · {job.location} · {payLabel(job)}
                    </p>
                  )}
                </div>
                <ApplicationStatusBadge status={a.status} />
              </div>

              {stageIndex >= 0 && (
                <ol className="mt-5 grid grid-cols-5 gap-2" aria-label="Application progress">
                  {APPLICATION_STAGES.map((s, i) => (
                    <li key={s}>
                      <div className={`h-1.5 rounded-full ${i <= stageIndex ? "bg-brand-500" : "bg-ink-100"}`} />
                      <p className={`mt-1.5 text-[11px] font-semibold ${i <= stageIndex ? "text-ink-800" : "text-ink-400"}`}>
                        {s === "under_review" ? "Review" : s === "interview_scheduled" ? "Interview" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
              {(interviews.get(a.id) ?? []).map((i) => {
                const Icon = i.mode === "video" ? Video : i.mode === "phone" ? Phone : MapPin;
                return (
                  <div key={i.id} className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm ring-1 ring-brand-100">
                    <CalendarClock className="h-5 w-5 text-brand-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="font-semibold text-ink-900">Interview: <LocalTime iso={i.scheduledAt} /> · {i.durationMinutes} min</p>
                      <p className="flex items-center gap-1.5 text-xs text-ink-600"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{INTERVIEW_MODE_LABEL[i.mode]}{i.location ? ` · ${i.location}` : ""}</p>
                      {i.notes && <p className="mt-1 text-xs text-ink-600">Note from the employer: {i.notes}</p>}
                    </div>
                    {i.meetingLink && <Button href={i.meetingLink} size="sm">Join meeting</Button>}
                  </div>
                );
              })}
              {a.status === "rejected" && (
                <p className="mt-4 text-sm text-ink-500">This employer chose to move forward with other candidates. Keep going, it takes most students several applications.</p>
              )}
              {a.status === "withdrawn" && <p className="mt-4 text-sm text-ink-500">You withdrew this application.</p>}

              {canStudentWithdraw(a.status) && (
                <div className="mt-5 flex justify-end">
                  <ActionButton
                    action={withdrawApplicationAction}
                    payload={{ applicationId: a.id }}
                    label="Withdraw application"
                    variant="ghost"
                    confirm="Withdraw this application? This cannot be undone."
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
