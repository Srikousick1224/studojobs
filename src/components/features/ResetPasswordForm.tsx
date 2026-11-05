"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PasswordField } from "@/components/ui/PasswordField";
import { Notice } from "@/components/ui/Misc";
import { SubmitButton } from "@/components/features/SubmitButton";
import { resetPasswordAction } from "@/lib/auth/actions";
import { fieldErrors, resetSchema } from "@/lib/auth/schemas";
import { initialAuthState } from "@/lib/auth/state";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialAuthState);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const f = new FormData(e.currentTarget);
    const r = resetSchema.safeParse({ password: String(f.get("password") ?? ""), confirmPassword: String(f.get("confirmPassword") ?? "") });
    if (!r.success) {
      e.preventDefault();
      setClientErrors(fieldErrors(r.error));
    } else setClientErrors({});
  }
  const err = (k: string) => clientErrors[k] ?? state.fieldErrors?.[k];

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && !state.fieldErrors && (
        <Notice tone="error">
          {state.message} <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>
        </Notice>
      )}
      <PasswordField id="password" name="password" label="New password" autoComplete="new-password" maxLength={72} hint="8–72 characters, with at least one letter and one number." error={err("password")} />
      <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm new password" autoComplete="new-password" maxLength={72} error={err("confirmPassword")} />
      <SubmitButton pending={pending} pendingText="Saving…">Set new password</SubmitButton>
    </form>
  );
}
