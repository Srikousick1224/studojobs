import type { Metadata } from "next";
import { AppearanceSettings } from "@/components/features/AppearanceSettings";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader title="Settings" text="Make StudoJob look and feel the way you like: colours, buttons, backgrounds, animations and more. Changes apply instantly and are remembered on this device." />
      <AppearanceSettings />
    </div>
  );
}
