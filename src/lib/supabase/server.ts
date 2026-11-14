import "server-only";
import { createServerClient } from "@supabase/ssr";
import { connection } from "next/server";
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
  // supabase-js reads the clock (Date.now) while it loads the session. Next's Cache Components rule is that
  // time-dependent code may only run at request time, so we step into the dynamic phase BEFORE creating the client.
  await connection();

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
