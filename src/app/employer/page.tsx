import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Building2, PlusCircle, Settings2, Star, Users } from "lucide-react";
import { ApplicationStatusBadge } from "@/components/features/ApplicationStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar, BarChart, FunnelBars, Notice, PageHeader, StatCard } from "@/components/ui/Misc";
import { Reveal, Spotlight } from "@/components/ui/Motion";
import { STATUS_LABEL, type ApplicationStatus } from "@/lib/stage-e/status";
import { daysSince } from "@/lib/stage-e/format";
import { getEmployerStats, listEmployerApplications } from "@/lib/stage-e/queries";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Employer dashboard" };

const QUICK = [
  { href: "/employer/jobs/new", title: "Post a role", text: "Reach students today", icon: PlusCircle },
  { href: "/employer/applicants", title: "Review applicants", text: "Shortlist the best", icon: Users },
  { href: "/employer/company", title: "Company profile", text: "Build trust", icon: Building2 },
  { href: "/employer/settings", title: "Hiring defaults", text: "Post in seconds", icon: Settings2 },
];

export default async function EmployerOverview() {
  await connection();
  const [stats, latest] = await Promise.all([getEmployerStats(), listEmployerApplications(4)]);
  const error = stats.error ?? latest.error;

  return (
    <>
      <PageHeader title="Recruitment overview" text="Applicants and activity for your open roles." action={<Button href="/employer/jobs/new">Post a role</Button>} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard index={0} label="Open roles" value={stats.openRoles} icon={Briefcase} />
        <StatCard index={1} label="Total applicants" value={stats.totalApplicants} icon={Users} />
        <StatCard index={2} label="Shortlisted" value={stats.shortlisted} icon={Star} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Quick actions">
        {QUICK.map((q, i) => (
          <Reveal key={q.href} variant="scale" delay={i * 70}>
            <Spotlight className="hover-lift h-full rounded-2xl bg-white ring-1 ring-ink-100">
              <Link href={q.href} className="group flex h-full flex-col gap-1 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white">
                  <q.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="mt-2 text-sm font-bold text-ink-900">{q.title}</span>
                <span className="text-xs text-ink-500">{q.text}</span>
              </Link>
            </Spotlight>
          </Reveal>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal variant="up"><Card className="h-full">
          <h2 className="text-lg font-bold">Applications, last 7 days</h2>
          <div className="mt-5">
            <BarChart data={stats.weekly} />
          </div>
        </Card></Reveal>
        <Reveal variant="up" delay={120}><Card className="h-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Latest applicants</h2>
            <Link href="/employer/applicants" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          {latest.rows.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No applicants yet. Applications to your published roles will appear here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-100">
              {latest.rows.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <Avatar name={a.studentName} size={40} square={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.studentName}</p>
                    <p className="truncate text-xs text-ink-500">
                      {a.jobTitle} · {timeAgo(daysSince(a.appliedAt)).toLowerCase()}
                    </p>
                  </div>
                  <ApplicationStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card></Reveal>
      </div>

      <Reveal variant="up">
        <Card>
          <h2 className="text-lg font-bold">Hiring pipeline</h2>
          <p className="mb-5 mt-1 text-sm text-ink-500">Where every applicant to your roles stands right now.</p>
          {stats.totalApplicants === 0 ? (
            <p className="text-sm text-ink-500">Your pipeline will fill in as students apply.</p>
          ) : (
            <FunnelBars rows={stats.pipeline.map((p) => ({ label: STATUS_LABEL[p.status as ApplicationStatus] ?? p.status, value: p.count, tone: p.status === "rejected" || p.status === "withdrawn" ? "bg-ink-300" : p.status === "selected" ? "bg-gradient-to-r from-mint-600 to-mint-400" : undefined }))} />
          )}
        </Card>
      </Reveal>
    </>
  );
}
