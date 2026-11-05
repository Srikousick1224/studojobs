import type { Metadata } from "next";
import { ProfileForm } from "@/components/features/ProfileForm";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "My profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="My profile" text="A complete profile gets more attention from employers." />
      <ProfileForm />
    </>
  );
}
