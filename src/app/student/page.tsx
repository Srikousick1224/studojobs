import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, CalendarCheck, CheckCircle2, Circle, Send } from "lucide-react";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/Misc";
import { getSaveState } from "@/lib/saved/queries";
import { getStudentOverview } from "@/lib/student/overview";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentOverview() {
  await connection();
  const o = await getStudentOverview();
  if (!o) return null; // the layout already redirects anyone who is not a student
  const save = await getSaveState(o.recommended.map((j) => j.id));
  const done = o.checklist.filter((c) => c.done).length;

  return (
    <>
      <PageHeader title="Welcome back" text="Here is where your job search stands." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Applications sent" value={o.applications} icon={Send} />
        <StatCard label="Interviews" value={o.interviews} icon={CalendarCheck} />
        <StatCard label="Saved opportunities" value={o.saved} icon={Bookmark} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-xl font-bold">{o.recommendedBy === "skills" ? "Recommended for you" : "Latest opportunities"}</h2>
          <p className="mb-4 text-sm text-ink-500">
            {o.recommendedBy === "skills" ? `Matched on your skills: ${o.skills.slice(0, 5).join(", ")}.` : "Add skills to your profile to get matches picked for you."}
          </p>
          {o.recommended.length === 0 ? (
            <EmptyState icon={Bookmark} title="No listings yet" text="New opportunities will appear here as employers publish them." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {o.recommended.map((j) => <LiveJobCard key={j.id} job={j} saveMode={save.mode} saved={save.saved.has(j.id)} />)}
            </div>
          )}
        </section>
        <Card>
          <h2 className="text-lg font-bold">Complete your profile</h2>
          <p className="mt-1 text-sm text-ink-500">{done} of {o.checklist.length} done</p>
          <ul className="mt-4 space-y-3">
            {o.checklist.map((c) => (
              <li key={c.key} className="flex items-center gap-3 text-sm">
                {c.done ? <CheckCircle2 className="h-5 w-5 text-mint-600" aria-label="Done" /> : <Circle className="h-5 w-5 text-ink-300" aria-label="To do" />}
                <span className={c.done ? "text-ink-500 line-through" : "font-medium text-ink-800"}>{c.label}</span>
              </li>
            ))}
          </ul>
          <Link href="/student/profile" className="mt-5 inline-block text-sm font-semibold text-brand-600 hover:underline">Go to profile →</Link>
        </Card>
      </div>
    </>
  );
}
