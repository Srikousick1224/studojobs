import { connection } from "next/server";
import type { Metadata } from "next";
import { ProfileForm } from "@/components/features/ProfileForm";
import { PageHeader } from "@/components/ui/Misc";
import { getMyProfile } from "@/lib/student/profile";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  await connection();
  const profile = await getMyProfile();
  if (!profile) return null; // the layout already redirects anyone who is not a student
  return (
    <>
      <PageHeader title="My profile" text="A complete profile gets more attention from employers." />
      <ProfileForm initial={profile} />
    </>
  );
}
