import type { MetadataRoute } from "next";

import { routeMetadata } from "@/content/site";
import { getSiteBaseUrl } from "@/lib/metadata";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteBaseUrl();
  return Object.keys(routeMetadata)
    .filter((route) => route !== "/thank-you")
    .map((route) => ({
      url: `${origin}${route === "/" ? "" : route}`,
      changeFrequency: route === "/" ? "weekly" : "monthly",
      priority: route === "/" ? 1 : route === "/book-caleb" ? 0.9 : 0.7,
    }));
}
