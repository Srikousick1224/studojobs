import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, NOT_CONFIGURED_MESSAGE } from "@/lib/env";

/** Supabase client for Client Components. Uses only the public key. */
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error(NOT_CONFIGURED_MESSAGE);
  return createBrowserClient(env.url, env.key);
}
