import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Stay safe from job scams", description: "How to spot fake jobs and internships, and what to do if you meet one." };

export default function Safety() {
  return (
    <LegalPage title="Stay safe from job scams" intro="Real employers hire you for your skills. They do not charge you to work.">
      <h2>Red flags</h2>
      <ul>
        <li>They ask you to <strong>pay</strong> a registration, training, laptop or “security” fee.</li>
        <li>They ask for bank details, passwords, or ID documents before any interview or offer.</li>
        <li>The pay is far above normal for a beginner, or the role is vague.</li>
        <li>They only talk on chat apps, use a personal email address, or push you to decide quickly.</li>
        <li>The company has no website, no real address, or no people you can find online.</li>
      </ul>
      <h2>Before you apply</h2>
      <ul>
        <li>Look for the <strong>Verified</strong> badge on the company page. It means our team checked their details.</li>
        <li>Search the company name and the recruiter’s name on your own.</li>
        <li>Share only what the application needs: a resume, not your ID numbers.</li>
      </ul>
      <h2>If something looks wrong</h2>
      <p>Open the listing and choose <strong>Report listing</strong>, or go to <Link href="/report">Report a listing</Link>. Never send money. If you already paid or shared documents, tell a trusted adult and contact your bank or local cyber-crime helpline.</p>
    </LegalPage>
  );
}
