import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createPageMetadata } from "@/lib/metadata";

describe("approved social metadata", () => {
  it("uses the approved route image and the homepage fallback", () => {
    expect(createPageMetadata("/").openGraph?.images).toEqual([
      {
        url: "/og/home-atlanta.jpg",
        width: 1200,
        height: 630,
        alt: "Caleb Jakes smiling — Pain Has Purpose",
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
        url: "/og/home-atlanta.jpg",
        width: 1200,
        height: 630,
        alt: "Caleb Jakes smiling — Pain Has Purpose",
      },
    ]);
  });

  it("keeps the private thank-you route out of social sharing", () => {
    expect(
      createPageMetadata("/thank-you", { noindex: true }).openGraph?.images,
    ).toBeUndefined();
  });

  it("pins the approved Atlanta homepage social card", () => {
    const image = readFileSync(
      join(process.cwd(), "public/og/home-atlanta.jpg"),
    );

    expect(createHash("sha256").update(image).digest("hex")).toBe(
      "4b687fea4c0e5c93a98fdb8134965edb98a97ddc5f6becbaaf841eddb638710c",
    );
  });
});
