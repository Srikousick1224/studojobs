import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "About StudoJob", description: "StudoJob helps students and fresh graduates find internships and entry-level jobs with employers who want to hire beginners." };

export default function About() {
  return (
    <LegalPage title="About StudoJob" intro="A career platform built for people who are just starting out.">
      <p>Most job sites are built for experienced people. Students and fresh graduates are left searching through listings that ask for years of experience, unclear pay and employers they cannot check.</p>
      <h2>What we are building</h2>
      <ul>
        <li>Internships, entry-level and graduate roles in one place, with pay and work mode shown clearly.</li>
        <li>Unpaid roles are labelled as unpaid, so nobody finds out after applying.</li>
        <li>Employers are reviewed before their listings go live, and every listing can be reported.</li>
        <li>A profile and application tracker so students always know where they stand.</li>
      </ul>
      <h2>How we keep it trustworthy</h2>
      <p>New listings from unverified employers wait for a review. Listings that ask for money are not allowed. Read our <Link href="/safety">safety tips</Link> and use <Link href="/report">Report a listing</Link> if something looks wrong.</p>
      <h2>Status</h2>
      <p>StudoJob is in active development. Features are added step by step, and we only announce what already works.</p>
    </LegalPage>
  );
}
