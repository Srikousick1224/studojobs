import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/student", "/employer", "/admin", "/auth", "/login", "/register"] }],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
