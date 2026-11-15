import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bookmark, CalendarCheck, CheckCircle2, Circle, Compass, GraduationCap, MessagesSquare, Search, Send, Settings2 } from "lucide-react";
import { Greeting } from "@/components/features/Greeting";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { Card } from "@/components/ui/Card";
import { Reveal, Spotlight } from "@/components/ui/Motion";
import { EmptyState, FunnelBars, PageHeader, ProgressRing, StatCard } from "@/components/ui/Misc";
import { getSaveState } from "@/lib/saved/queries";
import { STATUS_LABEL, type ApplicationStatus } from "@/lib/stage-e/status";
import { getStudentOverview } from "@/lib/student/overview";

export const metadata: Metadata = { title: "Student dashboard" };

const QUICK = [
  { href: "/jobs", title: "Find jobs", text: "Browse every open role", icon: Search },
  { href: "/internships", title: "Internships", text: "Start with real experience", icon: Compass },
  { href: "/resources", title: "Interview prep", text: "Practice and checklists", icon: GraduationCap },
  { href: "/community", title: "Community", text: "Ask, share, learn", icon: MessagesSquare },
  { href: "/student/settings", title: "Preferences", text: "Tune what you see", icon: Settings2 },
];

export default async function StudentOverview() {
  await connection();
  const o = await getStudentOverview();
  if (!o) return null; // the layout already redirects anyone who is not a student
  const save = await getSaveState(o.recommended.map((j) => j.id));
  const done = o.checklist.filter((c) => c.done).length;
  const pct = (done / o.checklist.length) * 100;

  return (
    <>
      <PageHeader title={<Greeting name={o.fullName} />} text="Here is where your job search stands." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard index={0} label="Applications sent" value={o.applications} icon={Send} />
        <StatCard index={1} label="Interviews" value={o.interviews} icon={CalendarCheck} />
        <StatCard index={2} label="Saved opportunities" value={o.saved} icon={Bookmark} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="Quick actions">
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
              {o.recommended.map((j, i) => (
                <Reveal key={j.id} variant="up" delay={i * 90}><LiveJobCard job={j} saveMode={save.mode} saved={save.saved.has(j.id)} /></Reveal>
              ))}
            </div>
          )}
        </section>
        <div className="space-y-6">
          <Reveal variant="left">
            <Card>
              <div className="flex items-center gap-4">
                <ProgressRing value={pct} label={`Profile ${Math.round(pct)}% complete`} />
                <div>
                  <h2 className="text-lg font-bold">Your profile</h2>
                  <p className="text-sm text-ink-500">{done} of {o.checklist.length} steps done</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {o.checklist.map((c) => (
                  <li key={c.key} className="flex items-center gap-3 text-sm">
                    {c.done ? <CheckCircle2 className="h-5 w-5 text-mint-600" aria-label="Done" /> : <Circle className="h-5 w-5 text-ink-300" aria-label="To do" />}
                    <span className={c.done ? "text-ink-500 line-through" : "font-medium text-ink-800"}>{c.label}</span>
                  </li>
                ))}
              </ul>
              <Link href="/student/profile" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-all hover:gap-2.5">Go to profile <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Card>
          </Reveal>
          <Reveal variant="left" delay={120}>
            <Card>
              <h2 className="text-lg font-bold">Application pipeline</h2>
              {o.pipeline.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">Apply to a role and its progress will show up here.</p>
              ) : (
                <div className="mt-4"><FunnelBars rows={o.pipeline.map((p) => ({ label: STATUS_LABEL[p.status as ApplicationStatus] ?? p.status, value: p.count }))} /></div>
              )}
              <Link href="/student/applications" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-all hover:gap-2.5">All applications <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Card>
          </Reveal>
        </div>
      </div>
    </>
  );
}
