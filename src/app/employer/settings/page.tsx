import { connection } from "next/server";
import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/ui/Misc";
import { getSettingsData } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Employer settings" };

export default async function EmployerSettings() {
  await connection();
  const d = await getSettingsData("employer");
  if (!d) return null; // the layout already redirects anyone who is not a employer
  return (
    <>
      <PageHeader title="Settings" text="Manage your account, what we notify you about, your hiring defaults, security and how StudoJob looks." />
      <SettingsPanel role="employer" {...d} />
    </>
  );
}
