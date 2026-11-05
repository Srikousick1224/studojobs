"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GitHubIcon, GoogleIcon } from "@/components/ui/BrandIcons";
import { Notice } from "@/components/ui/Misc";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";
const LABEL: Record<Provider, string> = { google: "Google", github: "GitHub" };

function rememberNext(next?: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = next
    ? `sj_next=${encodeURIComponent(next)}; Max-Age=600; Path=/; SameSite=Lax${secure}`
    : "sj_next=; Max-Age=0; Path=/";
}

/**
 * "Continue with Google / GitHub". Starts the Supabase OAuth flow from the browser.
 * The provider secrets live in Supabase; this code only ever sees the public key.
 * We do not say whether the person is a student or employer here: that is chosen AFTER the first sign-in.
 */
export function SocialButtons({ next }: { next?: string }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string>();

  // If the browser's Back button returns here from the provider page, unlock the buttons again.
  useEffect(() => {
    const unlock = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", unlock);
    return () => window.removeEventListener("pageshow", unlock);
  }, []);

  async function start(provider: Provider) {
    if (busy) return; // ignore repeated clicks
    setBusy(provider);
    setError(undefined);
    try {
      // Remember where the person was heading (checked again on the server before use).
      rememberNext(next);

      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      // Success: the browser is now leaving for the provider. Keep the buttons locked until it does.
    } catch (e) {
      setError(e instanceof Error && e.message.startsWith("StudoJob is not connected") ? e.message : `We couldn't start ${LABEL[provider]} sign-in. Please try again.`);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {(["google", "github"] as const).map((p) => (
        <Button key={p} type="button" variant="secondary" size="lg" className="w-full" onClick={() => start(p)} disabled={busy !== null} aria-busy={busy === p}>
          {busy === p ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : p === "google" ? <GoogleIcon className="h-5 w-5" /> : <GitHubIcon className="h-5 w-5" />}
          {busy === p ? `Connecting to ${LABEL[p]}…` : `Continue with ${LABEL[p]}`}
        </Button>
      ))}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

export function OrDivider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-400" role="separator">
      <span className="h-px flex-1 bg-ink-200" />
      {children}
      <span className="h-px flex-1 bg-ink-200" />
    </div>
  );
}
