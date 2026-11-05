import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Session-cookie settings shared by the server client and the proxy.
 *
 * @supabase/ssr defaults to httpOnly:false so a browser-side Supabase client can read the session.
 * StudoJob does all auth on the server (Server Actions + proxy), so the browser never needs to read it:
 * HttpOnly keeps the tokens out of reach of any injected script (XSS). Secure = HTTPS only in production.
 * If a later feature needs the BROWSER client to be logged in (e.g. direct uploads), route it through a
 * Server Action or a signed upload URL instead of loosening this.
 */
export const authCookieOptions: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
