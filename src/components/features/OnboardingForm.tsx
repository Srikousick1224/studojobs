"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { AccountTypePicker } from "@/components/features/AccountTypePicker";
import { SubmitButton } from "@/components/features/SubmitButton";
import { completeOnboardingAction } from "@/lib/auth/actions";
import { fieldErrors, onboardingSchema } from "@/lib/auth/schemas";
import { initialAuthState } from "@/lib/auth/state";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, initialAuthState);
  const [accountType, setAccountType] = useState<"student" | "employer">("student");
  const [fullName, setFullName] = useState(defaultName);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const r = onboardingSchema.safeParse({ accountType, fullName });
    if (!r.success) {
      e.preventDefault();
      setClientErrors(fieldErrors(r.error));
    } else setClientErrors({});
  }
  const err = (k: string) => clientErrors[k] ?? state.fieldErrors?.[k];

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && !state.fieldErrors && <Notice tone="error">{state.message}</Notice>}
      <AccountTypePicker value={accountType} onChange={setAccountType} error={err("accountType")} />
      <Input id="fullName" name="fullName" label="Full name" autoComplete="name" maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} error={err("fullName")} />
      <p className="text-xs text-ink-500">
        {accountType === "employer" ? "Employers are reviewed before they can post. " : ""}You can&apos;t change this choice later without contacting support.
      </p>
      <SubmitButton pending={pending} pendingText="Setting up…">Continue</SubmitButton>
    </form>
  );
}
