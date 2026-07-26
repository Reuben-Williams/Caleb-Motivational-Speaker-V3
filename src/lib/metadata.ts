import type { Metadata } from "next";

import { routeMetadata } from "@/content/site";
import { withBasePath } from "@/lib/base-path";

const productionOrigin = "https://www.calebjakesspeaks.com";

export function getSiteOrigin(): URL {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL;

  if (candidate) {
    try {
      return new URL(candidate);
    } catch {
      // Fall through to the canonical production origin.
    }
  }

  return new URL(productionOrigin);
}

export function getSiteBaseUrl(): string {
  const origin = getSiteOrigin().toString().replace(/\/$/, "");
  return `${origin}${withBasePath("/")}`.replace(/\/$/, "");
}

type RouteKey = keyof typeof routeMetadata;

const socialImages = {
  home: {
    url: withBasePath("/og/home.jpg"),
    width: 1200,
    height: 630,
    alt: "Caleb Jakes — Pain Has Purpose",
  },
  speaking: {
    url: withBasePath("/og/speaking.jpg"),
    width: 1200,
    height: 630,
    alt: "Caleb Jakes speaking",
  },
  bookMedia: {
    url: withBasePath("/og/book-media.jpg"),
    width: 1200,
    height: 630,
    alt: "Shedding Pounds, Gaining Purpose by Caleb Jakes",
  },
} as const;

export function createPageMetadata(
  route: RouteKey,
  options: { noindex?: boolean } = {},
): Metadata {
  const entry = routeMetadata[route];
  const socialImage =
    route === "/speaking"
      ? socialImages.speaking
      : route === "/book-media"
        ? socialImages.bookMedia
        : socialImages.home;
  const images = options.noindex ? undefined : [socialImage];

  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: withBasePath(route) },
    openGraph: {
      type: "website",
      url: withBasePath(route),
      title: entry.title,
      description: entry.description,
      siteName: "Caleb Jakes",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description: entry.description,
      images: images?.map(({ url, alt }) => ({ url, alt })),
    },
    robots: options.noindex ? { index: false, follow: false } : undefined,
  };
}
