import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/features/AuthForm";
import { RedirectIfSignedIn } from "@/components/features/RedirectIfSignedIn";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <p className="mb-8 mt-2 text-ink-500">Free for students. Employers are reviewed before they can post.</p>
      <Suspense fallback={null}><RedirectIfSignedIn /></Suspense>
      <AuthForm mode="register" />
    </>
  );
}
