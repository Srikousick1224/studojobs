import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * Honest limits: scripts still allow 'unsafe-inline' because the appearance script in the root layout and Next.js's own
 * bootstrap are inline. A nonce would remove that, but a nonce needs every page to render per request, which would switch
 * off the caching this app relies on. So this policy blocks the other big risks (other sites' scripts, plugins, framing,
 * base-tag tricks, calls to unknown servers) and the inline-script gap is tracked as a follow-up.
 *
 * Roll-out safety: set CSP_REPORT_ONLY=1 to send the same policy as "report only" (the browser logs problems but blocks nothing).
 * The Supabase address comes from NEXT_PUBLIC_SUPABASE_URL at build time.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV !== "production";
  let supabase = "";
  let supabaseWs = "";
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    supabase = u.origin;
    supabaseWs = `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}`;
  } catch {
    /* not configured: only our own origin is allowed */
  }
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabase].filter(Boolean),
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabase, supabaseWs, ...(dev ? ["ws:", "http://localhost:*"] : [])].filter(Boolean),
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Resume uploads go through a Server Action: allow the 5 MB file limit plus form overhead.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Hardening headers (see contentSecurityPolicy above for the Content-Security-Policy and its honest limits).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
