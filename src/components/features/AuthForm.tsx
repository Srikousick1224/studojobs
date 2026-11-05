"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { Notice } from "@/components/ui/Misc";
import { SubmitButton } from "@/components/features/SubmitButton";
import { ResendVerification } from "@/components/features/ResendVerification";
import { AccountTypePicker } from "@/components/features/AccountTypePicker";
import { OrDivider, SocialButtons } from "@/components/features/SocialButtons";
import { loginAction, registerAction } from "@/lib/auth/actions";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/auth/schemas";
import { initialAuthState } from "@/lib/auth/state";

/**
 * Login + registration form. The checks here are only for instant feedback;
 * the Server Actions repeat every check on the server.
 */
export function AuthForm({ mode, next, notice }: { mode: "login" | "register"; next?: string; notice?: string }) {
  const isRegister = mode === "register";
  const [state, formAction, pending] = useActionState(isRegister ? registerAction : loginAction, initialAuthState);
  const [accountType, setAccountType] = useState<"student" | "employer">("student");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  // Server Actions reset uncontrolled fields after they finish; keep what was typed (never the passwords).
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    const result = isRegister
      ? registerSchema.safeParse({ accountType, fullName: get("fullName"), email: get("email"), password: get("password"), confirmPassword: get("confirmPassword") })
      : loginSchema.safeParse({ email: get("email"), password: get("password") });
    if (!result.success) {
      e.preventDefault();
      setClientErrors(fieldErrors(result.error));
      return;
    }
    setClientErrors({});
  }

  const err = (k: string) => clientErrors[k] ?? state.fieldErrors?.[k];

  if (isRegister && state.status === "success") {
    return (
      <div className="space-y-5 text-center" aria-live="polite">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-100 text-mint-700">
          <MailCheck className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-bold">Check your inbox</h2>
          <p className="mt-2 text-sm text-ink-600">
            We sent a verification link to <strong className="break-all">{state.email}</strong>. Open it in <strong>this browser</strong> to finish creating your account.
          </p>
          <p className="mt-2 text-xs text-ink-500">Already registered with this address? Just <Link href="/login" className="font-semibold text-brand-600 hover:underline">log in</Link>.</p>
        </div>
        <div className="text-left"><ResendVerification email={state.email} /></div>
      </div>
    );
  }

  return (
    <>
    {notice && <div className="mb-5"><Notice tone="error">{notice}</Notice></div>}
    <div className="mb-5 space-y-5">
      <SocialButtons next={isRegister ? undefined : next} />
      {isRegister && <p className="text-center text-xs text-ink-500">With Google or GitHub you choose Student or Employer right after signing in.</p>}
      <OrDivider>{isRegister ? "or sign up with email" : "or log in with email"}</OrDivider>
    </div>
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-5">
      {state.status === "error" && state.message && !state.fieldErrors && <Notice tone="error">{state.message}</Notice>}
      {!isRegister && next && <input type="hidden" name="next" value={next} />}

      {isRegister && <AccountTypePicker value={accountType} onChange={setAccountType} error={err("accountType")} />}

      {isRegister && (
        <Input id="fullName" name="fullName" label="Full name" autoComplete="name" maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} error={err("fullName")} />
      )}
      <Input
        id="email"
        name="email"
        label={isRegister && accountType === "employer" ? "Work email" : "Email"}
        type="email"
        autoComplete="email"
        maxLength={254}
        hint={isRegister && accountType === "employer" ? "Use your company email. Employers are reviewed before they can post." : undefined}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={err("email")}
      />
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        maxLength={isRegister ? 72 : 128}
        hint={isRegister ? "8–72 characters, with at least one letter and one number." : undefined}
        error={err("password")}
      />
      {isRegister && <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm password" autoComplete="new-password" maxLength={72} error={err("confirmPassword")} />}

      {!isRegister && (
        <p className="-mt-2 text-right text-sm">
          <Link href="/forgot-password" className="font-semibold text-brand-600 hover:underline">Forgot password?</Link>
        </p>
      )}

      <SubmitButton pending={pending} pendingText={isRegister ? "Creating account…" : "Logging in…"}>
        {isRegister ? "Create account" : "Log in"}
      </SubmitButton>

      <p className="text-center text-sm text-ink-500">
        {isRegister ? (
          <>Already have an account? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></>
        ) : (
          <>New to StudoJob? <Link href="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link></>
        )}
      </p>
    </form>
    {/* Outside the login <form>: forms must not be nested. */}
    {state.needsVerification && <div className="mt-5"><ResendVerification email={state.email} /></div>}
    </>
  );
}
