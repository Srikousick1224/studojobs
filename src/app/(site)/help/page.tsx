import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Help centre" };

const faqs: [string, React.ReactNode][] = [
  ["Is StudoJob free for students?", "Yes. Browsing, saving, and applying are free for students."],
  ["Why can’t I save a job?", <>Saving needs a student account. <Link href="/login">Sign in</Link> or <Link href="/register">create one</Link>. Employer and admin accounts cannot save jobs.</>],
  ["Why do I see “Not verified” on a company?", "The employer has not completed our checks yet. You can still read its listings, but be extra careful and never pay to apply."],
  ["Who can see my profile?", "Only you, until you apply. After you apply, that employer can view your profile and resume for that application."],
  ["How do I report a fake listing?", <>Open the listing and choose <strong>Report listing</strong>, or use <Link href="/report">Report a listing</Link>. You need to be signed in.</>],
  ["How do I change colours and animations?", <>Open <Link href="/settings">Settings</Link>. Your choices stay in your browser.</>],
  ["I am an employer. How do I post?", "Register as an employer, add your company, and submit your listing. New employers are reviewed before listings go live."],
];

export default function Help() {
  return (
    <LegalPage title="Help centre" intro="Quick answers to common questions.">
      {faqs.map(([q, a]) => (
        <details key={q} className="rounded-xl bg-white p-4 shadow-soft ring-1 ring-ink-100 open:ring-brand-200">
          <summary className="cursor-pointer font-semibold text-ink-900">{q}</summary>
          <p className="mt-2 text-ink-700">{a}</p>
        </details>
      ))}
    </LegalPage>
  );
}
