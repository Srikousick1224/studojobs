import type { Metadata } from "next";
import { Building2, Flag, GraduationCap, Hourglass } from "lucide-react";
import { companies, getJobs } from "@/lib/data";
import { moderationQueue, platformWeeks } from "@/lib/sample-people";
import { Card } from "@/components/ui/Card";
import { BarChart, PageHeader, StatCard } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Admin overview" };

export default function AdminOverview() {
  const pendingEmployers = companies.filter((c) => !c.verified).length;
  const reports = moderationQueue.filter((m) => m.kind === "Report").length;
  return (
    <>
      <PageHeader title="Platform overview" text="Health, growth and trust signals at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sample listings" value={getJobs().length} icon={GraduationCap} />
        <StatCard label="Employers" value={companies.length} icon={Building2} />
        <StatCard label="Awaiting verification" value={pendingEmployers} icon={Hourglass} />
        <StatCard label="Open scam reports" value={reports} icon={Flag} />
      </div>
      <Card>
        <h2 className="text-lg font-bold">New applications per week (sample)</h2>
        <div className="mt-5"><BarChart data={platformWeeks} /></div>
      </Card>
    </>
  );
}
