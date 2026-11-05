/**
 * Only allow redirects to paths inside our own site. Blocks open-redirect
 * tricks such as "//evil.com" or "https://evil.com" in the ?next= parameter.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/") {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}
