import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/features/AuthForm";
import { RedirectIfSignedIn } from "@/components/features/RedirectIfSignedIn";
import { safeNextPath } from "@/lib/safe-redirect";
import { loginErrorMessage } from "@/lib/auth/messages";

export const metadata: Metadata = { title: "Log in" };

async function LoginForm({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const { next, error } = await searchParams;
  const raw = Array.isArray(next) ? next[0] : next;
  const errCode = Array.isArray(error) ? error[0] : error;
  return <AuthForm mode="login" next={raw ? safeNextPath(raw, "") || undefined : undefined} notice={loginErrorMessage(errCode)} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Welcome back</h1>
      <p className="mb-8 mt-2 text-ink-500">Log in to track applications and saved opportunities.</p>
      <Suspense fallback={null}><RedirectIfSignedIn /></Suspense>
      <Suspense fallback={<div className="h-[34rem]" aria-hidden="true" />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
