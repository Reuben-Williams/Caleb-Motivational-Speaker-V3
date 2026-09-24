import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CALEB_MEDIA_SEEDS,
  getCalebSeedMedia,
} from "./media-seed-catalog";

const expectedSeeds = {
  "seed-home-hero-cutout-v1": "/media/people/caleb-home-hero-cutout.webp",
  "seed-home-story-primary-v1": "/media/photos/caleb-book-portrait.webp",
  "seed-home-story-secondary-v1": "/media/photos/caleb-book-wide-02.webp",
  "seed-book-cover-v1": "/media/book/caleb-book-front.webp",
  "seed-about-hero-v1": "/media/photos/caleb-book-portrait.webp",
  "seed-about-collage-v1": "/media/photos/caleb-book-wide-01.webp",
  "seed-speaking-hero-v1": "/media/photos/caleb-speaking-wide.webp",
  "seed-schools-hero-v1": "/media/photos/caleb-speaking-mobile.webp",
  "seed-faith-hero-v1": "/media/photos/caleb-book-wide-03.webp",
  "seed-conferences-hero-v1": "/media/photos/caleb-speaking-wide.webp",
  "seed-book-media-hero-v1": "/media/book/caleb-book-amazon.webp",
  "seed-faq-hero-v1": "/media/photos/caleb-book-wide-02.webp",
} as const;

describe("Caleb approved media seed catalog", () => {
  it("maps every stable seed ID to the reviewed first-party asset", () => {
    expect(Object.fromEntries(CALEB_MEDIA_SEEDS.map((asset) => [asset.id, asset.path]))).toEqual(
      expectedSeeds,
    );
    expect(new Set(CALEB_MEDIA_SEEDS.map((asset) => asset.id)).size).toBe(
      CALEB_MEDIA_SEEDS.length,
    );
  });

  it("contains only existing local WebP assets with useful alt text", () => {
    for (const asset of CALEB_MEDIA_SEEDS) {
      expect(asset.path).toMatch(/^\/media\/.+\.webp$/);
      expect(asset.path).not.toMatch(/^https?:/);
      expect(asset.mimeType).toBe("image/webp");
      expect(asset.source).toBe("seed");
      expect(asset.alt.trim().length).toBeGreaterThan(0);
      expect(Array.from(asset.alt.normalize("NFC")).length).toBeLessThanOrEqual(240);
      expect(existsSync(resolve("public", asset.path.slice(1)))).toBe(true);
      expect(getCalebSeedMedia(asset.id)).toEqual(asset);
    }
    expect(getCalebSeedMedia("not-approved")).toBeUndefined();
  });

  it("records the stable seed identities without rewriting existing provenance", () => {
    const manifest = readFileSync(resolve("docs/media-manifest.md"), "utf8");
    for (const [id, path] of Object.entries(expectedSeeds)) {
      expect(manifest).toContain(`\`${id}\``);
      expect(manifest).toContain(`\`public${path}\``);
    }
    expect(manifest).toContain("Site editor seed identities");
  });
});
