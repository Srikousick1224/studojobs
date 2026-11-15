import Link from "next/link";
import { ArrowRight, BadgeCheck, Search, ShieldCheck, Target, Wallet } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { RotatingWord } from "@/components/features/RotatingWord";
import { SkillMarquee } from "@/components/features/SkillMarquee";
import { TiltCard } from "@/components/features/TiltCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, Notice } from "@/components/ui/Misc";
import { Briefcase, CheckCircle2 } from "lucide-react";
import { Parallax, Reveal, ScrollStory, Spotlight, type StoryStep } from "@/components/ui/Motion";
import { searchPublicJobs } from "@/lib/stage-e/job-queries";
import { getSaveState } from "@/lib/saved/queries";

const popular = ["Data analyst", "React", "Design", "Marketing", "Python", "Remote"];

const features = [
  { icon: Wallet, title: "Pay is always clear", text: "Every listing shows pay up front. Unpaid roles are labelled, never hidden in the fine print." },
  { icon: ShieldCheck, title: "Employers are checked", text: "Companies go through review before they can post, and any listing can be reported in two clicks." },
  { icon: Target, title: "Built for beginners", text: "Internships, fresher jobs and graduate programmes, with no “3+ years required” noise." },
];



const panel = "w-full rounded-3xl bg-white p-6 shadow-lift ring-1 ring-ink-100";
const storySteps: StoryStep[] = [
  {
    kicker: "Profile", title: "Build your profile", text: "Add your education, skills and resume once. Every application after that is one click.",
    visual: (
      <div className={panel}>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-bold text-white">You</span>
          <div className="space-y-2"><div className="h-3 w-36 rounded bg-ink-200" /><div className="h-2.5 w-24 rounded bg-ink-100" /></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{["Python", "SQL", "Communication", "Figma"].map((t) => <span key={t} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{t}</span>)}</div>
        <div className="mt-6 h-2 rounded-full bg-ink-100"><div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-brand-500 to-mint-500" /></div>
        <p className="mt-2 text-xs font-semibold text-ink-500">Profile 80% complete</p>
      </div>
    ),
  },
  {
    kicker: "Search", title: "Find the right fit", text: "Filter by role, pay, work mode and level, and see pay up front on every listing.",
    visual: (
      <div className={panel}>
        <div className="flex flex-wrap gap-2">{["Internship", "Remote", "Paid", "Entry-level"].map((t, i) => <span key={t} className={`rounded-full px-3 py-1 text-xs font-semibold ${i < 3 ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-700"}`}>{t}</span>)}</div>
        <div className="mt-5 space-y-3">{[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-ink-100">
            <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-mint-400 to-brand-400" />
            <div className="flex-1 space-y-2"><div className="h-3 w-3/4 rounded bg-ink-200" /><div className="h-2.5 w-1/2 rounded bg-ink-100" /></div>
            <span className="rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-bold text-mint-700">Paid</span>
          </div>))}</div>
      </div>
    ),
  },
  {
    kicker: "Apply", title: "Apply and track", text: "See every application’s status in one place, from applied to interview to offer.",
    visual: (
      <div className={panel}>
        <ol className="space-y-4">{["Applied", "Under review", "Shortlisted", "Interview"].map((t, i) => (
          <li key={t} className="flex items-center gap-3">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-500 ring-2 ring-brand-300"}`}>{i < 3 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</span>
            <span className={`text-sm font-semibold ${i < 3 ? "text-ink-900" : "text-ink-500"}`}>{t}</span>
          </li>))}</ol>
      </div>
    ),
  },
  {
    kicker: "Prepare", title: "Start your career", text: "Practice interview questions and use the resume checklist before you hit send.",
    visual: (
      <div className={panel}>
        <p className="font-display text-lg font-bold">Interview ready</p>
        <ul className="mt-4 space-y-3">{["Tell me about yourself", "Why this role?", "A project you are proud of"].map((q, i) => (
          <li key={q} className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 text-sm font-medium text-ink-800"><CheckCircle2 className={`h-5 w-5 ${i < 2 ? "text-mint-600" : "text-ink-300"}`} />{q}</li>))}</ul>
      </div>
    ),
  },
];

/** Real published jobs for the home page. Reads the database per request, so it sits in Suspense. */
async function FeaturedJobs() {
  await connection();
  const { rows: featured, error: featuredError } = await searchPublicJobs({ page: 1 });
  const shown = featured.slice(0, 4);
  const save = await getSaveState(shown.map((j) => j.id));
  return (
    <>
      {featuredError && <div className="mt-6"><Notice tone="error">{featuredError}</Notice></div>}
      {!featuredError && shown.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={Briefcase} title="No opportunities published yet" text="Verified employers' published roles will appear here as soon as they go live." />
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {shown.map((j, i) => (
          <Reveal key={j.id} variant="up" delay={i * 90}>
            <LiveJobCard job={j} saveMode={save.mode} saved={save.saved.has(j.id)} />
          </Reveal>
        ))}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden="true" />
        <Parallax speed={0.25} className="absolute -right-24 -top-24" ><div className="h-96 w-96 rounded-full bg-brand-300/40 blur-3xl" aria-hidden="true" /></Parallax>
        <Parallax speed={0.1} className="absolute -left-24 top-40"><div className="h-80 w-80 rounded-full bg-mint-400/25 blur-3xl" aria-hidden="true" /></Parallax>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div>
            <p style={{ "--i": 0 } as React.CSSProperties} className="hero-in inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-700 shadow-soft ring-1 ring-brand-100">
              <span className="h-2 w-2 rounded-full bg-mint-500" aria-hidden="true" />
              For students and fresh graduates
            </p>
            <h1 style={{ "--i": 1 } as React.CSSProperties} className="hero-in mt-6 text-balance text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Your first real <span className="relative whitespace-nowrap text-brand-600"><RotatingWord words={["opportunity", "internship", "fresher job", "career"]} /><svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none" aria-hidden="true"><path d="M2 5C50 1 150 1 198 5" stroke="var(--color-mint-500)" strokeWidth="4" strokeLinecap="round" /></svg></span> starts here.
            </h1>
            <p style={{ "--i": 2 } as React.CSSProperties} className="hero-in mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
              Internships, fresher jobs and graduate programmes from employers who actually want to hire beginners — with honest pay and verified companies.
            </p>

            <form action="/jobs" method="get" role="search" style={{ "--i": 3 } as React.CSSProperties} className="hero-in mt-8 flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-2.5 shadow-lift ring-1 ring-ink-100 sm:flex-row">
              <label htmlFor="hero-q" className="sr-only">Search roles, skills or companies</label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input id="hero-q" name="q" type="search" placeholder="Role, skill or company" className="h-12 w-full rounded-xl bg-transparent pl-12 pr-3 text-base placeholder:text-ink-400 focus:outline-none" />
              </div>
              <Button type="submit" size="lg" className="h-12">Search</Button>
            </form>

            <p style={{ "--i": 4 } as React.CSSProperties} className="hero-in mt-5 flex flex-wrap items-center gap-2 text-sm text-ink-500">
              Popular:
              {popular.map((p) => (
                <Link key={p} href={`/jobs?q=${encodeURIComponent(p)}`} className="rounded-full bg-white px-3 py-1 font-medium text-ink-700 ring-1 ring-ink-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200">
                  {p}
                </Link>
              ))}
            </p>
          </div>

          {/* decorative product preview */}
          <div style={{ "--i": 3 } as React.CSSProperties} className="hero-in relative mx-auto hidden w-full max-w-md lg:block" aria-hidden="true">
            <div className="animate-float-b absolute -left-6 top-10 w-[88%] rounded-2xl bg-white p-5 opacity-80 shadow-soft ring-1 ring-ink-100">
              <div className="h-3 w-1/2 rounded bg-ink-100" />
              <div className="mt-3 h-3 w-1/3 rounded bg-ink-100" />
            </div>
            <TiltCard>
            <div className="animate-float-a relative rounded-3xl bg-white p-6 shadow-lift ring-1 ring-ink-100">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-display font-bold text-white">SJ</span>
                <div>
                  <p className="font-display text-lg font-bold">Your next opportunity</p>
                  <p className="flex items-center gap-1 text-sm text-ink-500">Verified employer <BadgeCheck className="h-4 w-4 text-mint-600" /></p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <span className="rounded-full bg-mint-100 px-3 py-1 text-xs font-semibold text-mint-700">Internship</span>
                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">Hybrid</span>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Paid</span>
              </div>
              <p className="mt-5 font-display text-2xl font-extrabold">Pay shown up front</p>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {["Applied", "Review", "Shortlist", "Interview"].map((s, i) => (
                  <div key={s}>
                    <div className={`h-1.5 rounded-full ${i < 3 ? "bg-brand-500" : "bg-ink-200"}`} />
                    <p className="mt-1.5 text-[10px] font-semibold text-ink-500">{s}</p>
                  </div>
                ))}
              </div>
            </div>
            </TiltCard>
            <div className="animate-float-c absolute -bottom-6 -right-4 flex items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white shadow-lift">
              <ShieldCheck className="h-6 w-6 text-mint-400" />
              <p className="text-sm font-semibold leading-tight">Verified employer<br /><span className="text-xs font-normal text-ink-300">Reviewed before posting</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* SKILLS MARQUEE */}
      <section className="pb-14" aria-label="Skills students are hired for">
        <SkillMarquee />
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} variant="blur" delay={i * 120}>
              <Spotlight className="hover-lift h-full rounded-2xl bg-white p-7 shadow-soft ring-1 ring-ink-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <f.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-bold">{f.title}</h2>
                <p className="mt-2 leading-relaxed text-ink-600">{f.text}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold">Fresh opportunities</h2>
            <p className="mt-2 text-ink-500">Real opportunities from verified employers.</p>
          </div>
          <Link href="/jobs" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:gap-2.5 transition-all">
            Browse all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
        <Suspense fallback={<div className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Loading opportunities"><div className="h-40 animate-pulse rounded-2xl bg-ink-100" /><div className="h-40 animate-pulse rounded-2xl bg-ink-100" /></div>}>
          <FeaturedJobs />
        </Suspense>
      </section>

      {/* HOW IT WORKS: pinned scroll story */}
      <section className="mt-24" aria-labelledby="how-title">
        <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-600">How it works</p>
          <h2 id="how-title" className="mt-2 max-w-3xl text-balance text-3xl font-extrabold sm:text-5xl">From <span className="text-sweep">“where do I start?”</span> to your first offer.</h2>
        </Reveal>
        <ScrollStory className="mt-10" steps={storySteps} />
      </section>

      {/* EMPLOYER CTA */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal variant="scale"><div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-white sm:px-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Hiring beginners? Meet motivated students.</h2>
            <p className="mt-4 text-lg text-ink-300">Post internships and entry-level roles, review applicants in one dashboard, and schedule interviews without the spreadsheet.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" variant="mint" size="lg">Create employer account</Button>
              <Button href="/employer" variant="ghost" size="lg" className="text-white hover:bg-white/10">See the dashboard</Button>
            </div>
          </div>
        </div></Reveal>
      </section>
    </>
  );
}
