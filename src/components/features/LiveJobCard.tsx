import Link from "next/link";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import { hueFromName, type JobListItem } from "@/lib/stage-e/job-view";
import { daysSince, jobTypeLabel, workModeLabel } from "@/lib/stage-e/format";
import { Avatar } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";
import { SaveButton } from "./SaveButton";

const EMPLOYMENT: Record<JobListItem["employment"], string> = { full_time: "Full-time", part_time: "Part-time", contract: "Contract" };

/** Same card design as JobCard, but driven by a real database row. */
export function LiveJobCard({ job }: { job: JobListItem }) {
  return (
    <article className="group relative rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200">
      <div className="flex items-start gap-4">
        <Avatar name={job.companyName} hue={hueFromName(job.companyName)} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug sm:text-lg">
            <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-600">
            {job.companyName}
            {job.companyVerified && <BadgeCheck className="h-4 w-4 text-mint-600" aria-label="Verified employer" />}
          </p>
        </div>
        <SaveButton jobId={job.id} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={job.type === "internship" ? "mint" : job.type === "freelance" ? "amber" : "brand"}>{jobTypeLabel(job.type)}</Badge>
        <Badge>{workModeLabel(job.workMode)}</Badge>
        <Badge>{EMPLOYMENT[job.employment]}</Badge>
        {!job.isPaid && <Badge tone="amber">Unpaid</Badge>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-500">
        <span className="font-semibold text-ink-800">{job.payText}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{job.location}</span>
        {job.publishedAt && (
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{timeAgo(daysSince(job.publishedAt))}</span>
        )}
      </div>
    </article>
  );
}
