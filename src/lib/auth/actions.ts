"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { emailOnlySchema, fieldErrors, loginSchema, onboardingSchema, registerSchema, resetSchema, text } from "@/lib/auth/schemas";
import { fetchProfile } from "@/lib/auth/profile";
import { postLoginPath, ROLE_HOME, viewerHome } from "@/lib/auth/roles";
import type { AuthState } from "@/lib/auth/state";

/**
 * Every function here runs ONLY on the server and re-validates everything it
 * receives. They are the real security boundary; the form's own checks are
 * just for speed. Error messages are deliberately generic where a specific
 * message would reveal whether an email address has an account.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";
const RATE_LIMITED = "Too many attempts. Please wait a minute and try again.";

type AuthErrorLike = { code?: string; status?: number } | null | undefined;

function isRateLimited(e: AuthErrorLike) {
  return !!e && (e.status === 429 || e.code === "over_request_rate_limit" || e.code === "over_email_send_rate_limit");
}

const failure = (message: string, extra: Partial<AuthState> = {}): AuthState => ({ status: "error", message, ...extra });

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    accountType: text(form, "accountType"),
    fullName: text(form, "fullName"),
    email: text(form, "email"),
    password: text(form, "password"),
    confirmPassword: text(form, "confirmPassword"),
  });
  if (!parsed.success) return failure("Please fix the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  if (!isSupabaseConfigured()) return failure(NOT_CONFIGURED_MESSAGE);

  const { accountType, fullName, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The database trigger reads these. It only ever accepts "employer"; everything else becomes "student".
      data: { full_name: fullName, role: accountType },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/auth/verified`,
    },
  });

  if (error) {
    if (isRateLimited(error)) return failure(RATE_LIMITED);
    if (error.code === "weak_password") return failure("Please choose a stronger password.", { fieldErrors: { password: "That password is too easy to guess. Try a longer one." } });
    if (error.code === "email_address_invalid") return failure("Please fix the highlighted fields.", { fieldErrors: { email: "Enter a valid email address." } });
    if (error.code === "signup_disabled") return failure("New sign-ups are switched off right now. Please try again later.");
    // Do not reveal whether an account already exists for this address.
    if (error.code === "user_already_exists") return { status: "success", email };
    console.error("[auth] signUp failed:", error.code ?? error.name);
    return failure(GENERIC_ERROR);
  }

  // If the Supabase project has "Confirm email" switched OFF, a session exists right away.
  if (data.session) redirect(ROLE_HOME[accountType]);

  // With "Confirm email" ON, Supabase answers the same way for a brand-new and an already-registered
  // address (so nobody can probe which emails exist). We do the same.
  return { status: "success", email };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: text(form, "email"),
    password: text(form, "password"),
    next: text(form, "next") || undefined,
  });
  if (!parsed.success) return failure("Please fix the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  if (!isSupabaseConfigured()) return failure(NOT_CONFIGURED_MESSAGE);

  const { email, password, next } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return failure("Your email address isn't verified yet. Open the link we emailed you, or resend it below.", { needsVerification: true, email });
    }
    if (isRateLimited(error)) return failure(RATE_LIMITED);
    if (error && error.code !== "invalid_credentials") console.error("[auth] signIn failed:", error.code ?? error.name);
    return failure("Invalid email or password.");
  }

  // The destination depends on the role stored in the database, never on anything the browser sent.
  const profile = await fetchProfile(supabase, data.user.id);
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return failure("We couldn't load your account. Please contact support.");
  }
  if (profile.isSuspended) {
    await supabase.auth.signOut({ scope: "local" });
    return failure("This account has been suspended. Please contact support.");
  }
  if (!profile.onboarded) redirect("/onboarding");

  redirect(postLoginPath(next, profile.role));
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    // "local" = this browser only. (The default would sign the user out of every device.)
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/");
}

// ---------------------------------------------------------------------------
// Resend verification email
// ---------------------------------------------------------------------------
export async function resendVerificationAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email: text(form, "email") });
  if (!parsed.success) return failure("Enter a valid email address.", { fieldErrors: fieldErrors(parsed.error) });
  if (!isSupabaseConfigured()) return failure(NOT_CONFIGURED_MESSAGE);

  const { email } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/auth/verified` },
  });
  if (isRateLimited(error)) return failure("Please wait a minute before asking for another email.", { email });
  if (error) console.error("[auth] resend failed:", error.code ?? error.name);

  return { status: "success", email, message: "If that address is waiting for verification, a new link is on its way." };
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export async function forgotPasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email: text(form, "email") });
  if (!parsed.success) return failure("Enter a valid email address.", { fieldErrors: fieldErrors(parsed.error) });
  if (!isSupabaseConfigured()) return failure(NOT_CONFIGURED_MESSAGE);

  const { email } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  if (isRateLimited(error)) return failure("Please wait a minute before asking for another email.");
  if (error) console.error("[auth] recover failed:", error.code ?? error.name);

  // Same answer whether or not the address has an account.
  return { status: "success", email, message: "If an account exists for that address, we've emailed a link to reset the password." };
}

// ---------------------------------------------------------------------------
// Reset password (only works inside the session created by the emailed link)
// ---------------------------------------------------------------------------
export async function resetPasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({ password: text(form, "password"), confirmPassword: text(form, "confirmPassword") });
  if (!parsed.success) return failure("Please fix the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  if (!isSupabaseConfigured()) return failure(NOT_CONFIGURED_MESSAGE);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("This reset link has expired or was already used. Please request a new one.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return failure("Please fix the highlighted fields.", { fieldErrors: { password: "Choose a password you haven't used before." } });
    if (error.code === "weak_password") return failure("Please fix the highlighted fields.", { fieldErrors: { password: "That password is too easy to guess. Try a longer one." } });
    if (isRateLimited(error)) return failure(RATE_LIMITED);
    console.error("[auth] updateUser failed:", error.code ?? error.name);
    return failure(GENERIC_ERROR);
  }

  // Anyone who knew the old password (or held an old session) is now signed out everywhere else.
  await supabase.auth.signOut({ scope: "others" });

  const profile = await fetchProfile(supabase, user.id);
  if (!profile || profile.isSuspended) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login");
  }
  redirect(viewerHome(profile));
}

// ---------------------------------------------------------------------------
// First Google/GitHub sign-in: choose Student or Employer (once)
// ---------------------------------------------------------------------------
export async function completeOnboardingAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = onboardingSchema.safeParse({ accountType: text(form, "accountType"), fullName: text(form, "fullName") });
  if (!parsed.success) return failure("Please fix the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  if (!isSupabaseConfigured()) return failure(NOT_CONFIGURED_MESSAGE);

  const supabase = await createClient();
  // Who is this? Asked of the Auth server, never taken from the form.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email_confirmed_at) redirect("/login");

  // The database does the real work and the real checking: one time only, student or employer only,
  // never admin, never for suspended users (see migration 007).
  const { error } = await supabase.rpc("complete_onboarding", { p_role: parsed.data.accountType });
  if (error && error.code !== "42501") {
    console.error("[auth] complete_onboarding failed:", error.code ?? error.message);
    return failure(error.code === "PGRST202" ? "Account setup isn't available yet. Please contact support." : GENERIC_ERROR);
  }
  // 42501 = this account was already set up (double click, second tab): keep the existing role, just continue.
  if (!error) await supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", user.id);

  const profile = await fetchProfile(supabase, user.id);
  redirect(profile ? viewerHome(profile) : "/login");
}
