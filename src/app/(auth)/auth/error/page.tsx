import type { Metadata } from "next";
import { Suspense } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ResendVerification } from "@/components/features/ResendVerification";

export const metadata: Metadata = { title: "Link problem" };

type Params = Promise<{ flow?: string; reason?: string }>;

async function Body({ searchParams }: { searchParams: Params }) {
  const { flow, reason } = await searchParams;
  const recovery = flow === "recovery";
  const expired = reason === "expired";
  return (
    <>
      <h1 className="text-3xl font-extrabold">{expired ? "This link has expired" : "This link didn't work"}</h1>
      <p className="text-ink-500">
        {expired ? "For your security, email links only work for a short time." : "It may have already been used, or it was opened in a different browser than the one you signed up or asked for the email in."}
      </p>
      {recovery ? (
        <Button href="/forgot-password" size="lg" className="w-full">Request a new reset link</Button>
      ) : (
        <div className="space-y-4 text-left">
          <p className="text-sm text-ink-600">Enter your email and we&apos;ll send a fresh verification link. If you&apos;re already verified, just log in.</p>
          <ResendVerification />
          <Button href="/login" variant="ghost" className="w-full">Log in</Button>
        </div>
      )}
    </>
  );
}

export default function AuthErrorPage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="space-y-5 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <TriangleAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <Suspense fallback={<div className="h-48" aria-hidden="true" />}><Body searchParams={searchParams} /></Suspense>
    </div>
  );
}
