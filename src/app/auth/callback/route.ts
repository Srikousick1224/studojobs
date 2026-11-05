import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { fetchProfile } from "@/lib/auth/profile";
import { postLoginPath } from "@/lib/auth/roles";

/**
 * Landing point for every link that brings someone back from outside:
 *  - confirm-signup and reset-password emails  (URL carries ?next=...)
 *  - Google / GitHub sign-in                   (URL has NO ?next; our own "sj_next" cookie holds the page they wanted)
 *
 * We swap the one-time code for a real session (stored in secure cookies), then decide where the person belongs
 * from the role stored in OUR database. Nothing in the URL or the provider's data can choose a role.
 *
 * PKCE note: the browser that STARTED the sign-in/email holds the matching secret in a cookie, so the link must
 * be finished in that same browser. Anything else lands on a friendly error page.
 */
const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];
const NEXT_COOKIE = "sj_next";
type Failure = "expired" | "invalid" | "cancelled" | "exists";

function readNextCookie(request: NextRequest) {
  const raw = request.cookies.get(NEXT_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const oauth = !searchParams.has("next");
  const rawNext = oauth ? readNextCookie(request) : searchParams.get("next");
  const next = safeNextPath(rawNext, "/");
  const flow = next.startsWith("/reset-password") ? "recovery" : "signup";

  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    if (oauth) res.cookies.set(NEXT_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  };
  const fail = (kind: Failure) => {
    if (oauth) {
      const code = { expired: "oauth_expired", invalid: "oauth_failed", cancelled: "oauth_cancelled", exists: "oauth_exists" }[kind];
      return go(`/login?error=${code}`);
    }
    return go(`/auth/error?flow=${flow}&reason=${kind === "expired" ? "expired" : "invalid"}`);
  };

  // The provider (or Supabase) can send the person back with an error instead of a code.
  const providerError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  if (providerError || errorCode) {
    if (providerError === "access_denied" && oauth) return fail("cancelled");
    if (errorCode === "otp_expired") return fail("expired");
    if (errorCode && ["email_exists", "identity_already_exists", "user_already_exists"].includes(errorCode)) return fail("exists");
    return fail("invalid");
  }
  if (!isSupabaseConfigured()) return fail("invalid");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let error: { code?: string } | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    return fail("invalid");
  }
  if (error) return fail(error.code === "otp_expired" ? "expired" : "invalid");

  // Password-reset links just open the reset form.
  if (!oauth && flow === "recovery") return go(next);

  // Signed in. Check the account before letting it anywhere.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) {
    // e.g. a GitHub account with no verified email: never keep such a session.
    await supabase.auth.signOut({ scope: "local" });
    return oauth ? go("/login?error=no_verified_email") : go("/auth/error?flow=signup&reason=invalid");
  }
  const profile = await fetchProfile(supabase, user.id);
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return go("/login?error=no_profile");
  }
  if (profile.isSuspended) {
    await supabase.auth.signOut({ scope: "local" });
    return go("/login?error=suspended");
  }
  // First Google/GitHub sign-in: they have not chosen Student or Employer yet.
  if (!profile.onboarded) return go("/onboarding");

  return go(oauth ? postLoginPath(rawNext, profile.role) : next);
}
