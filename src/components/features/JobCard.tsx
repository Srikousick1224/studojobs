import Link from "next/link";
import { BadgeCheck, Clock, MapPin } from "lucide-react";
import type { Job } from "@/lib/types";
import { getCompany } from "@/lib/data";
import { formatMoney, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { SaveButton } from "./SaveButton";

export function payLabel(job: Job) {
  if (!job.isPaid || !job.stipend) return "Unpaid";
  const { min, max, period } = job.stipend;
  const per = period === "month" ? "/month" : period === "year" ? "/year" : " per project";
  return `${formatMoney(min)} – ${formatMoney(max)}${per}`;
}

export function JobCard({ job }: { job: Job }) {
  const company = getCompany(job.companySlug);
  if (!company) return null;
  return (
    <article className="group relative rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200">
      <div className="flex items-start gap-4">
        <Avatar name={company.name} hue={company.hue} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug sm:text-lg">
            <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-600">
            {company.name}
            {company.verified && <BadgeCheck className="h-4 w-4 text-mint-600" aria-label="Verified employer" />}
          </p>
        </div>
        <SaveButton jobId={job.id} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={job.type === "internship" ? "mint" : job.type === "freelance" ? "amber" : "brand"}>
          {job.type === "job" ? "Job" : job.type === "internship" ? "Internship" : "Freelance"}
        </Badge>
        <Badge>{job.workMode === "onsite" ? "On-site" : job.workMode === "hybrid" ? "Hybrid" : "Remote"}</Badge>
        <Badge>{job.employment === "full-time" ? "Full-time" : job.employment === "part-time" ? "Part-time" : "Contract"}</Badge>
        {!job.isPaid && <Badge tone="amber">Unpaid</Badge>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-500">
        <span className="font-semibold text-ink-800">{payLabel(job)}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{job.location}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{timeAgo(job.postedDaysAgo)}</span>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills">
        {job.skills.slice(0, 4).map((s) => (
          <li key={s} className="rounded-md bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600">{s}</li>
        ))}
      </ul>
    </article>
  );
}
