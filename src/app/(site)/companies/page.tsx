import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { companies, getJobsByCompany } from "@/lib/data";
import { Avatar, PageHeader, SampleDataNotice } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Companies hiring beginners" };

export default function CompaniesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title="Companies hiring beginners" text="Explore employers, see what they do, and check whether they are verified." />
      <SampleDataNotice />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => {
          const open = getJobsByCompany(c.slug).length;
          return (
            <article key={c.slug} className="group relative rounded-2xl bg-white p-6 shadow-soft ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200">
              <div className="flex items-center gap-4">
                <Avatar name={c.name} hue={c.hue} size={52} />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">
                    <Link href={`/companies/${c.slug}`} className="after:absolute after:inset-0 after:rounded-2xl">{c.name}</Link>
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-ink-500"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{c.location}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-600">{c.about}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge>{c.industry}</Badge>
                {c.verified ? <Badge tone="mint"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified</Badge> : <Badge tone="amber">Pending</Badge>}
                <span className="ml-auto text-sm font-semibold text-brand-600">{open} open {open === 1 ? "role" : "roles"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
