import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, Circle, Send } from "lucide-react";
import { getJobs, sampleApplications } from "@/lib/data";
import { JobCard } from "@/components/features/JobCard";
import { SavedCountCard } from "@/components/features/SavedCountCard";
import { Card } from "@/components/ui/Card";
import { PageHeader, StatCard } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Student dashboard" };

const sampleSkills = ["SQL", "Python", "Excel"];
const checklist = [
  { label: "Create your account", done: true },
  { label: "Add your education", done: false },
  { label: "Add at least 5 skills", done: false },
  { label: "Upload your resume", done: false },
];

export default function StudentOverview() {
  const recommended = getJobs()
    .map((j) => ({ j, score: j.skills.filter((s) => sampleSkills.includes(s)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.j);
  const interviews = sampleApplications.filter((a) => a.status === "interview").length;

  return (
    <>
      <PageHeader title="Welcome back" text="Here is where your job search stands." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Applications sent" value={sampleApplications.length} icon={Send} />
        <StatCard label="Interviews" value={interviews} icon={CalendarCheck} />
        <SavedCountCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-xl font-bold">Recommended for you</h2>
          <p className="mb-4 text-sm text-ink-500">Matched on the sample skills: {sampleSkills.join(", ")}.</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {recommended.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
        <Card>
          <h2 className="text-lg font-bold">Complete your profile</h2>
          <ul className="mt-4 space-y-3">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-3 text-sm">
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
