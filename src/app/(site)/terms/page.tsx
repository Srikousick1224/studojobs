import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" intro="The rules for using StudoJob." draft>
      <h2>Using StudoJob</h2>
      <ul>
        <li>You must give true information and keep your password private.</li>
        <li>Students use the platform to find and apply for opportunities. Employers use it to publish real opportunities.</li>
      </ul>
      <h2>Employers must not</h2>
      <ul>
        <li>Ask candidates to pay money for a job, internship, training or equipment.</li>
        <li>Publish misleading pay, role or company details, or discriminate unfairly.</li>
        <li>Collect candidate data for any purpose other than hiring for the listed role.</li>
      </ul>
      <h2>Content and moderation</h2>
      <p>Listings, posts and comments may be reviewed, hidden or removed if they break these rules. Accounts that repeatedly break them may be suspended.</p>
      <h2>No guarantee</h2>
      <p>StudoJob connects people but does not employ anyone and cannot promise a job or a hire. Check each opportunity yourself.</p>
    </LegalPage>
  );
}
