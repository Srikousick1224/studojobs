import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/supabase/cookies";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Runs in proxy.ts on every request: refreshes the auth token and copies the
 * refreshed cookies onto the response. Returns the verified user id (or null)
 * and the Supabase client (so the proxy can look up the role for dashboards).
 * getClaims() validates the JWT signature, unlike reading the cookie directly.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return { response: () => response, userId: null as string | null, configured: false, supabase: null };

  const supabase = createServerClient(env.url, env.key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { response: () => response, userId: (data?.claims?.sub as string | undefined) ?? null, configured: true, supabase };
}
