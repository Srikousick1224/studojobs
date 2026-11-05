import { z } from "zod";

/**
 * Public Supabase settings (safe for the browser).
 * Next.js only inlines NEXT_PUBLIC_* variables when they are written out
 * literally, so we read them one by one here.
 *
 * Placeholder values from .env.example are rejected on purpose, so the app
 * says "not configured" instead of failing with a confusing network error.
 */
const schema = z.object({
  url: z
    .url()
    .refine((u) => !/your|example|placeholder/i.test(u), "Replace the placeholder URL")
    .refine((u) => /\.supabase\.(co|in)$/i.test(new URL(u).hostname) || /^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname), "Not a Supabase URL"),
  key: z
    .string()
    .min(20)
    .refine((k) => !/your|placeholder/i.test(k), "Replace the placeholder key")
    .refine((k) => k.startsWith("sb_publishable_") || k.startsWith("eyJ"), "Use the publishable (or legacy anon) key"),
});

export function getSupabaseEnv() {
  const parsed = schema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success ? parsed.data : null;
}

export function isSupabaseConfigured() {
  return getSupabaseEnv() !== null;
}

export const NOT_CONFIGURED_MESSAGE =
  "StudoJob is not connected to Supabase yet. Add your project URL and publishable key to .env.local (see README), then restart the dev server.";

/**
 * Public address of this site, used to build the links inside auth emails.
 * Falls back to localhost only outside production.
 */
export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return process.env.NODE_ENV === "production" ? "" : "http://localhost:3000";
}
