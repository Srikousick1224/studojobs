import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { companies, getCompany, getJobsByCompany } from "@/lib/data";
import { JobCard } from "@/components/features/JobCard";
import { Avatar, Notice } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";

export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getCompany(slug)?.name ?? "Company not found" };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompany(slug);
  if (!company) notFound();
  const open = getJobsByCompany(slug);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar name={company.name} hue={company.hue} size={80} />
        <div>
          <h1 className="text-3xl font-extrabold">{company.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{company.location}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />{company.size} people</span>
            <Badge>{company.industry}</Badge>
            {company.verified ? <Badge tone="mint"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified</Badge> : <Badge tone="amber">Verification pending</Badge>}
          </p>
        </div>
      </header>
      {!company.verified && <Notice tone="warn">This company is still under review. Be careful with personal information, and never pay to apply.</Notice>}
      <section>
        <h2 className="text-xl font-bold">About</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-ink-700">{company.about}</p>
      </section>
      <section>
        <h2 className="text-xl font-bold">Open roles ({open.length})</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {open.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      </section>
    </div>
  );
}
