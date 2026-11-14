import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" intro="What we collect, why, and the control you have." draft>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your name, email address and role (student, employer).</li>
        <li><strong>Student profile:</strong> headline, education, skills, location and, later, the resume you choose to upload.</li>
        <li><strong>Activity:</strong> jobs you save, applications you send, and community posts or reports you make.</li>
        <li><strong>On your device:</strong> your appearance settings are kept in your browser and are not sent to us.</li>
      </ul>
      <h2>Who can see it</h2>
      <ul>
        <li>Your profile and resume are visible to an employer <strong>only after you apply to that employer’s listing</strong>.</li>
        <li>Community posts are public. Your name and role appear on them.</li>
        <li>Platform administrators can see data they need to review reports and verify employers.</li>
      </ul>
      <h2>How it is protected</h2>
      <p>Data is stored with Supabase. Access rules are enforced inside the database, so one user cannot read another user’s private rows. Resumes are kept in private storage and shared through short-lived links. No system is perfectly secure, and we will tell affected users if a serious incident happens.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile at any time. A way to export or delete your account and data is planned and must be in place before launch.</p>
      <h2>Cookies</h2>
      <p>We use one sign-in cookie that keeps you logged in. We do not use advertising cookies.</p>
    </LegalPage>
  );
}
