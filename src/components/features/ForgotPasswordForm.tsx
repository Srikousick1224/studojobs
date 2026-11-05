"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { SubmitButton } from "@/components/features/SubmitButton";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { emailOnlySchema, fieldErrors } from "@/lib/auth/schemas";
import { initialAuthState } from "@/lib/auth/state";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialAuthState);
  const [email, setEmail] = useState("");
  const [clientError, setClientError] = useState<string>();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const r = emailOnlySchema.safeParse({ email });
    if (!r.success) {
      e.preventDefault();
      setClientError(fieldErrors(r.error).email);
    } else setClientError(undefined);
  }

  if (state.status === "success") {
    return (
      <div className="space-y-5 text-center" aria-live="polite">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-mint-700">
          <MailCheck className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold">Check your inbox</h2>
        <p className="text-sm text-ink-600">{state.message} Open the link in <strong>this browser</strong>.</p>
        <Link href="/login" className="inline-block text-sm font-semibold text-brand-600 hover:underline">← Back to log in</Link>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && !state.fieldErrors && <Notice tone="error">{state.message}</Notice>}
      <Input id="email" name="email" label="Email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} error={clientError ?? state.fieldErrors?.email} />
      <SubmitButton pending={pending} pendingText="Sending link…">Send reset link</SubmitButton>
      <p className="text-center text-sm text-ink-500"><Link href="/login" className="font-semibold text-brand-600 hover:underline">← Back to log in</Link></p>
    </form>
  );
}
