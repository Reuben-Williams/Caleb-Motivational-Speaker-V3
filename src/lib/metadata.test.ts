import { describe, expect, it } from "vitest";

import { createPageMetadata } from "@/lib/metadata";

describe("approved social metadata", () => {
  it("uses the approved route image and the homepage fallback", () => {
    expect(createPageMetadata("/").openGraph?.images).toEqual([
      {
        url: "/og/home.jpg",
        width: 1200,
        height: 630,
        alt: "Caleb Jakes — Pain Has Purpose",
      },
    ]);
    expect(createPageMetadata("/speaking").openGraph?.images).toEqual([
      {
        url: "/og/speaking.jpg",
        width: 1200,
        height: 630,
        alt: "Caleb Jakes speaking",
      },
    ]);
    expect(createPageMetadata("/book-media").openGraph?.images).toEqual([
      {
        url: "/og/book-media.jpg",
        width: 1200,
        height: 630,
        alt: "Shedding Pounds, Gaining Purpose by Caleb Jakes",
      },
    ]);
    expect(createPageMetadata("/faq").openGraph?.images).toEqual([
      {
        url: "/og/home.jpg",
        width: 1200,
        height: 630,
        alt: "Caleb Jakes — Pain Has Purpose",
      },
    ]);
  });

  it("keeps the private thank-you route out of social sharing", () => {
    expect(
      createPageMetadata("/thank-you", { noindex: true }).openGraph?.images,
    ).toBeUndefined();
  });
});

