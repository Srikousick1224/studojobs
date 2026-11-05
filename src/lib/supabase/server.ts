import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase/cookies";
import { getSupabaseEnv, NOT_CONFIGURED_MESSAGE } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * It acts AS THE LOGGED-IN USER, so Row Level Security applies to every query.
 * We deliberately do not use the service-role key anywhere in the app.
 */
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error(NOT_CONFIGURED_MESSAGE);
  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot write cookies.
          // This is fine: proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}
