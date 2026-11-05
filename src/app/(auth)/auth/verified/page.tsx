import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getViewer } from "@/lib/auth/dal";
import { viewerHome } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Email verified" };

async function Next() {
  const viewer = await getViewer();
  return viewer ? (
    <Button href={viewerHome(viewer)} size="lg" className="w-full">{viewer.onboarded ? "Go to your dashboard" : "Continue"}</Button>
  ) : (
    <Button href="/login" size="lg" className="w-full">Log in</Button>
  );
}

export default function VerifiedPage() {
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-mint-700">
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-3xl font-extrabold">Email verified</h1>
      <p className="text-ink-500">Thanks. Your email address is confirmed and your StudoJob account is ready.</p>
      <Suspense fallback={<div className="h-13" aria-hidden="true" />}><Next /></Suspense>
    </div>
  );
}
