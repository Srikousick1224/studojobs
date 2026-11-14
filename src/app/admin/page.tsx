import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Flag, GraduationCap, Hourglass, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BarChart, PageHeader, StatCard } from "@/components/ui/Misc";
import { getAdminOverview } from "@/lib/admin/overview";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  await connection();
  const o = await getAdminOverview();
  const todo = o.listingsAwaitingReview + o.companiesAwaitingVerification + o.openReports;
  return (
    <>
      <PageHeader title="Platform overview" text="Health, growth and trust signals at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Published listings" value={o.publishedListings} icon={GraduationCap} />
        <StatCard label="Students" value={o.students} icon={Users} />
        <StatCard label="Employers" value={o.employers} icon={Building2} />
        <StatCard label="Listings awaiting review" value={o.listingsAwaitingReview} icon={Hourglass} />
        <StatCard label="Employers awaiting verification" value={o.companiesAwaitingVerification} icon={Hourglass} />
        <StatCard label="Open reports" value={o.openReports} icon={Flag} />
      </div>
      {todo > 0 && (
        <p className="text-sm text-ink-600">
          {todo} {todo === 1 ? "item needs" : "items need"} attention. <Link href="/admin/moderation" className="font-semibold text-brand-600 hover:underline">Open the review queue →</Link>
        </p>
      )}
      <Card>
        <h2 className="text-lg font-bold">New applications per week (last 8 weeks)</h2>
        <div className="mt-5"><BarChart data={o.weekly} /></div>
      </Card>
    </>
  );
}
