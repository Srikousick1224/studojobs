import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const cols = [
  { title: "Students", links: [["Find jobs", "/jobs"], ["Find internships", "/internships"], ["Career resources", "/resources"], ["Student dashboard", "/student"]] },
  { title: "Employers", links: [["Post an opportunity", "/employer/jobs/new"], ["Employer dashboard", "/employer"], ["Browse companies", "/companies"]] },
  { title: "Trust & safety", links: [["Stay safe from scams", "/safety"], ["Report a listing", "/report"], ["Help centre", "/help"], ["Appearance settings", "/settings"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink-950 text-ink-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-5 lg:px-8">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
            A career platform built for students and fresh graduates. Honest listings, clear pay, and employers who want to hire beginners.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-sm font-bold text-white">{c.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-400 transition hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-800 px-4 py-5 text-center text-xs text-ink-500">
        © StudoJob. In active development: features are added step by step.
      </div>
    </footer>
  );
}
