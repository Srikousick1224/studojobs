import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Star, Users } from "lucide-react";
import { ApplicationStatusBadge } from "@/components/features/ApplicationStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar, BarChart, Notice, PageHeader, StatCard } from "@/components/ui/Misc";
import { daysSince } from "@/lib/stage-e/format";
import { getEmployerStats, listEmployerApplications } from "@/lib/stage-e/queries";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Employer dashboard" };

export default async function EmployerOverview() {
  await connection();
  const [stats, latest] = await Promise.all([getEmployerStats(), listEmployerApplications(4)]);
  const error = stats.error ?? latest.error;

  return (
    <>
      <PageHeader title="Recruitment overview" text="Applicants and activity for your open roles." action={<Button href="/employer/jobs/new">Post a role</Button>} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open roles" value={stats.openRoles} icon={Briefcase} />
        <StatCard label="Total applicants" value={stats.totalApplicants} icon={Users} />
        <StatCard label="Shortlisted" value={stats.shortlisted} icon={Star} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Applications, last 7 days</h2>
          <div className="mt-5">
            <BarChart data={stats.weekly} />
          </div>
        </Card>
        <Card>
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
        </Card>
      </div>
    </>
  );
}
