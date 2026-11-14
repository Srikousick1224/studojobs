import type { Metadata } from "next";
import { BookOpen, FileText, MessageSquare, Compass, Code2 } from "lucide-react";
import { resources } from "@/lib/data";
import { Badge } from "@/components/ui/Badge";
import { Notice, PageHeader } from "@/components/ui/Misc";
import { InterviewPractice } from "@/components/features/InterviewPractice";
import { ResumeChecklist } from "@/components/features/ResumeChecklist";
import { PayConverter } from "@/components/features/PayConverter";

export const metadata: Metadata = { title: "Career resources" };

const icons = { Resume: FileText, Interview: MessageSquare, Skills: Code2, Career: Compass } as const;

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title="Career resources" text="Short, practical guides for resumes, interviews and skills. Written for students with little or no experience." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ResumeChecklist />
        <InterviewPractice />
      </div>
      <PayConverter />
      <h2 className="pt-4 text-2xl font-extrabold">Guides</h2>
      <Notice tone="info">The guide library is being written. The three tools above work today; the guides below are planned topics and are not clickable yet.</Notice>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => {
          const Icon = icons[r.category] ?? BookOpen;
          return (
            <article key={r.id} className="reveal hover-lift rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <Badge tone="amber">Coming soon</Badge>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-400">{r.category} · {r.minutes} min read</p>
              <h2 className="mt-1.5 text-lg font-bold leading-snug">{r.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{r.summary}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
