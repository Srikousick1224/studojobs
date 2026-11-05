import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/features/ResetPasswordForm";
import { Notice } from "@/components/ui/Misc";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Set a new password" };

/** The form only appears if the emailed link has already signed this browser in. */
async function Gate() {
  let signedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
  }
  if (!signedIn) {
    return (
      <Notice tone="warn">
        This reset link is missing, expired or already used. <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>.
      </Notice>
    );
  }
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Set a new password</h1>
      <p className="mb-8 mt-2 text-ink-500">Choose a strong password you don&apos;t use anywhere else.</p>
      <Suspense fallback={<div className="h-56" aria-hidden="true" />}>
        <Gate />
      </Suspense>
    </>
  );
}
