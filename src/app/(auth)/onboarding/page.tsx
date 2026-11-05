import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/features/OnboardingForm";
import { Button } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth/dal";
import { viewerHome } from "@/lib/auth/roles";
import { logoutAction } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Finish setting up" };

/** Only people who are signed in, verified and have NOT yet chosen a role see the form. */
async function Gate() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.isSuspended || viewer.onboarded) redirect(viewerHome(viewer));
  return (
    <>
      <p className="mb-6 text-sm text-ink-500">Signed in as <strong className="break-all text-ink-800">{viewer.email}</strong></p>
      <OnboardingForm defaultName={viewer.fullName} />
      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="ghost" className="w-full">Not you? Log out</Button>
      </form>
    </>
  );
}

export default function OnboardingPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Welcome to StudoJob</h1>
      <p className="mb-2 mt-2 text-ink-500">One last step: tell us how you&apos;ll use StudoJob.</p>
      <Suspense fallback={<div className="h-80" aria-hidden="true" />}>
        <Gate />
      </Suspense>
    </>
  );
}
