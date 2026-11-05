import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/features/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Forgot your password?</h1>
      <p className="mb-8 mt-2 text-ink-500">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </>
  );
}
