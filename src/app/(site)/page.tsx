import Link from "next/link";
import { ArrowRight, BadgeCheck, Search, ShieldCheck, Target, Wallet, UserPlus, FileText, Rocket } from "lucide-react";
import { Suspense } from "react";
import { connection } from "next/server";
import { LiveJobCard } from "@/components/features/LiveJobCard";
import { RotatingWord } from "@/components/features/RotatingWord";
import { SkillMarquee } from "@/components/features/SkillMarquee";
import { TiltCard } from "@/components/features/TiltCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, Notice } from "@/components/ui/Misc";
import { Briefcase } from "lucide-react";
import { searchPublicJobs } from "@/lib/stage-e/job-queries";
import { getSaveState } from "@/lib/saved/queries";

const popular = ["Data analyst", "React", "Design", "Marketing", "Python", "Remote"];

const features = [
  { icon: Wallet, title: "Pay is always clear", text: "Every listing shows pay up front. Unpaid roles are labelled, never hidden in the fine print." },
  { icon: ShieldCheck, title: "Employers are checked", text: "Companies go through review before they can post, and any listing can be reported in two clicks." },
  { icon: Target, title: "Built for beginners", text: "Internships, fresher jobs and graduate programmes, with no “3+ years required” noise." },
];

const steps = [
  { icon: UserPlus, title: "Build your profile", text: "Add your education, skills and resume once." },
  { icon: Search, title: "Find the right fit", text: "Filter by role, pay, work mode and level." },
  { icon: FileText, title: "Apply and track", text: "See every application’s status in one place." },
  { icon: Rocket, title: "Start your career", text: "Prepare for interviews with our career guides." },
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
          <div key={j.id} className="stagger" style={{ "--i": i } as React.CSSProperties}>
            <LiveJobCard job={j} saveMode={save.mode} saved={save.saved.has(j.id)} />
          </div>
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
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-300/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-24 top-40 h-80 w-80 rounded-full bg-mint-400/25 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-700 shadow-soft ring-1 ring-brand-100">
              <span className="h-2 w-2 rounded-full bg-mint-500" aria-hidden="true" />
              For students and fresh graduates
            </p>
            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Your first real <span className="relative whitespace-nowrap text-brand-600"><RotatingWord words={["opportunity", "internship", "fresher job", "career"]} /><svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none" aria-hidden="true"><path d="M2 5C50 1 150 1 198 5" stroke="var(--color-mint-500)" strokeWidth="4" strokeLinecap="round" /></svg></span> starts here.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
              Internships, fresher jobs and graduate programmes from employers who actually want to hire beginners — with honest pay and verified companies.
            </p>

            <form action="/jobs" method="get" role="search" className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-2.5 shadow-lift ring-1 ring-ink-100 sm:flex-row">
              <label htmlFor="hero-q" className="sr-only">Search roles, skills or companies</label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input id="hero-q" name="q" type="search" placeholder="Role, skill or company" className="h-12 w-full rounded-xl bg-transparent pl-12 pr-3 text-base placeholder:text-ink-400 focus:outline-none" />
              </div>
              <Button type="submit" size="lg" className="h-12">Search</Button>
            </form>

            <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-ink-500">
              Popular:
              {popular.map((p) => (
                <Link key={p} href={`/jobs?q=${encodeURIComponent(p)}`} className="rounded-full bg-white px-3 py-1 font-medium text-ink-700 ring-1 ring-ink-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200">
                  {p}
                </Link>
              ))}
            </p>
          </div>

          {/* decorative product preview */}
          <div className="relative mx-auto hidden w-full max-w-md lg:block" aria-hidden="true">
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
          {features.map((f) => (
            <div key={f.title} className="reveal hover-lift rounded-2xl bg-white p-7 shadow-soft ring-1 ring-ink-100">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-bold">{f.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold">Fresh opportunities</h2>
            <p className="mt-2 text-ink-500">Real opportunities from verified employers.</p>
          </div>
          <Link href="/jobs" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:gap-2.5 transition-all">
            Browse all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <Suspense fallback={<div className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Loading opportunities"><div className="h-40 animate-pulse rounded-2xl bg-ink-100" /><div className="h-40 animate-pulse rounded-2xl bg-ink-100" /></div>}>
          <FeaturedJobs />
        </Suspense>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold">From “where do I start?” to your first offer</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="reveal relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 font-display text-lg font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-ink-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* EMPLOYER CTA */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-white sm:px-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Hiring beginners? Meet motivated students.</h2>
            <p className="mt-4 text-lg text-ink-300">Post internships and entry-level roles, review applicants in one dashboard, and schedule interviews without the spreadsheet.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" variant="mint" size="lg">Create employer account</Button>
              <Button href="/employer" variant="ghost" size="lg" className="text-white hover:bg-white/10">See the dashboard</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
