import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  // Set NEXT_PUBLIC_SUPPORT_EMAIL in the hosting settings to show a real address. No address is invented here.
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const valid = email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
  return (
    <LegalPage title="Contact us" intro="We read every message about safety and accuracy.">
      {valid ? (
        <p>Email us at <a href={`mailto:${valid}`}>{valid}</a>.</p>
      ) : (
        <p>A public support address has not been published yet. For now, use the tools on the site.</p>
      )}
      <ul>
        <li>Spotted a suspicious listing? <Link href="/report">Report a listing</Link>.</li>
        <li>Looking for answers? Read the <Link href="/help">Help centre</Link>.</li>
        <li>Worried about scams? Read our <Link href="/safety">safety tips</Link>.</li>
      </ul>
    </LegalPage>
  );
}
