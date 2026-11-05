"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { resendVerificationAction } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/state";

const COOLDOWN_SECONDS = 60;

/** "Resend verification email". Pass `email` when we already know it; otherwise it asks for it. */
export function ResendVerification({ email }: { email?: string }) {
  const [state, formAction, pending] = useActionState(resendVerificationAction, initialAuthState);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (state.status !== "success") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the cooldown when the server confirms a send
    setWait(COOLDOWN_SECONDS);
  }, [state]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Input id="resend-email" name="email" label="Email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      )}
      <Button type="submit" variant="secondary" className="w-full" disabled={pending || wait > 0}>
        {pending ? "Sending…" : wait > 0 ? `Resend available in ${wait}s` : "Resend verification email"}
      </Button>
      {state.message && <Notice tone={state.status === "error" ? "error" : "success"}>{state.message}</Notice>}
    </form>
  );
}
