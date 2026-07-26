import type { MetadataRoute } from "next";

import { getSiteBaseUrl } from "@/lib/metadata";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteBaseUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/thank-you" },
    sitemap: `${origin}/sitemap.xml`,
  };
}
