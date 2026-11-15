import { connection } from "next/server";
import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/ui/Misc";
import { getSettingsData } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Student settings" };

export default async function StudentSettings() {
  await connection();
  const d = await getSettingsData("student");
  if (!d) return null; // the layout already redirects anyone who is not a student
  return (
    <>
      <PageHeader title="Settings" text="Manage your account, what we notify you about, your job preferences, privacy, security and how StudoJob looks." />
      <SettingsPanel role="student" {...d} />
    </>
  );
}
