import { describe, expect, it } from "vitest";

import {
  CALEB_EDITOR_MIGRATION,
  CALEB_EDITOR_SCHEMA_CONTRACT,
  CALEB_EDITOR_SITE_CONFIG,
  findCalebEditorRegion,
} from "./site-config";

const expectedPageRegions = {
  "/": [
    "home.hero.eyebrow",
    "home.hero.title.line1",
    "home.hero.title.emphasis",
    "home.hero.body",
    "home.hero.credential",
    "home.hero.location",
    "home.hero.image",
    "home.story.image.primary",
    "home.story.image.secondary",
    "home.story.eyebrow",
    "home.story.title.line1",
    "home.story.title.emphasis",
    "home.story.lead",
    "home.story.body",
    "home.story.quote",
    "home.reel.eyebrow",
    "home.reel.title",
    "home.reel.body",
    "home.book.cover",
    "home.book.eyebrow",
    "home.book.heading",
    "home.book.title",
    "home.book.body",
  ],
  "/about": [
    "about.hero.eyebrow",
    "about.hero.title",
    "about.hero.intro",
    "about.hero.image",
    "about.chapter.struggle.title",
    "about.chapter.struggle.body",
    "about.chapter.transformation.title",
    "about.chapter.transformation.body",
    "about.chapter.calling.title",
    "about.chapter.calling.body",
    "about.chapter.mission.title",
    "about.chapter.mission.body",
    "about.collage.image",
    "about.collage.eyebrow",
    "about.collage.title",
    "about.collage.body",
    "about.collage.quote",
  ],
  "/speaking": [
    "speaking.hero.eyebrow",
    "speaking.hero.title",
    "speaking.hero.intro",
    "speaking.hero.image",
    "speaking.messages.eyebrow",
    "speaking.messages.title",
    "speaking.messages.body",
    "speaking.messages.note",
  ],
  "/schools-colleges": [
    "schools.hero.eyebrow",
    "schools.hero.title",
    "schools.hero.intro",
    "schools.hero.image",
    "schools.audience.note",
    "schools.hero.button",
    "schools.hero.imageLabel",
    "schools.audience.title",
    "schools.audience.noteSecond",
    ...[1, 2, 3, 4].map((index) => `schools.audience.challenge.${index}`),
    ...[1, 2, 3, 4].map((index) => `schools.audience.outcome.${index}`),
    "schools.approach.eyebrow",
    ...[1, 2, 3, 4].map((index) => `schools.approach.item.${index}`),
    "schools.final.body",
  ],
  "/faith-events": [
    "faith.hero.eyebrow",
    "faith.hero.title",
    "faith.hero.intro",
    "faith.hero.image",
    "faith.audience.note",
  ],
  "/conferences-workshops": [
    "conferences.hero.eyebrow",
    "conferences.hero.title",
    "conferences.hero.intro",
    "conferences.hero.image",
    "conferences.audience.note",
  ],
  "/book-media": [
    "bookMedia.hero.eyebrow",
    "bookMedia.hero.title",
    "bookMedia.hero.intro",
    "bookMedia.hero.image",
    "bookMedia.book.cover",
    "bookMedia.book.eyebrow",
    "bookMedia.book.title",
    "bookMedia.book.lead",
    "bookMedia.book.body",
    "bookMedia.reel.eyebrow",
    "bookMedia.reel.title",
    "bookMedia.reel.body",
    "bookMedia.inquiry.eyebrow",
    "bookMedia.inquiry.title",
    "bookMedia.inquiry.body",
  ],
  "/faq": [
    "faq.hero.eyebrow",
    "faq.hero.title",
    "faq.hero.intro",
    "faq.hero.image",
    ...[
      "audiences",
      "secular",
      "faith-adjustment",
      "international",
      "formats",
      "keynote-workshop",
      "timing",
      "quote-information",
      "panels-podcasts",
      "travel",
      "media-kit",
    ].flatMap((key) => [
      `faq.item.${key}.question`,
      `faq.item.${key}.answer`,
    ]),
  ],
  "/book-caleb": [
    "bookCaleb.intro.eyebrow",
    "bookCaleb.intro.title",
    "bookCaleb.intro.body",
  ],
  "/privacy": [],
  "/thank-you": [
    "thankYou.empty.eyebrow",
    "thankYou.empty.title",
    "thankYou.empty.body",
  ],
} as const;

describe("Caleb editor site configuration", () => {
  it("pins the reviewed migration and schema contract without choosing an adapter", () => {
    expect(CALEB_EDITOR_MIGRATION).toBe("0015_caleb_attached_site_editor.sql");
    expect(CALEB_EDITOR_SCHEMA_CONTRACT).toEqual({
      builder: 2,
      forms: 2,
      growth: 1,
    });
    expect(CALEB_EDITOR_SITE_CONFIG).not.toHaveProperty("adapter");
    expect(CALEB_EDITOR_SITE_CONFIG.globalRegions).toEqual([]);
  });

  it("defines every frozen page and region exactly once", () => {
    expect(CALEB_EDITOR_SITE_CONFIG.pages.map((page) => page.path)).toEqual(
      Object.keys(expectedPageRegions),
    );

    const observedIds = CALEB_EDITOR_SITE_CONFIG.pages.flatMap((page) =>
      page.regions.map((region) => region.id),
    );
    expect(observedIds).toHaveLength(128);
    expect(new Set(observedIds).size).toBe(observedIds.length);

    for (const [path, expectedIds] of Object.entries(expectedPageRegions)) {
      const page = CALEB_EDITOR_SITE_CONFIG.pages.find((item) => item.path === path);
      expect(page?.regions.map((region) => region.id)).toEqual(expectedIds);
    }
  });

  it("allows only required, non-linkable text and image regions with canonical fallbacks", () => {
    for (const page of CALEB_EDITOR_SITE_CONFIG.pages) {
      for (const region of page.regions) {
        expect(region.id).toMatch(/^[A-Za-z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)+$/);
        expect(["text", "image"]).toContain(region.kind);
        expect(region.required).toBe(true);
        expect(region.linkable).toBe(false);
        expect(region.fallback.type).toBe(region.kind);
        expect(region.maxCodePoints).toBeGreaterThan(0);
      }
    }
  });

  it("enforces the exact reviewed limits by semantic text class", () => {
    expect(findCalebEditorRegion("/", "home.hero.eyebrow")?.maxCodePoints).toBe(120);
    expect(findCalebEditorRegion("/", "home.hero.title.line1")?.maxCodePoints).toBe(160);
    expect(findCalebEditorRegion("/", "home.hero.body")?.maxCodePoints).toBe(600);
    expect(findCalebEditorRegion("/", "home.story.quote")?.maxCodePoints).toBe(300);
    expect(findCalebEditorRegion("/faq", "faq.item.audiences.question")?.maxCodePoints).toBe(220);
    expect(findCalebEditorRegion("/faq", "faq.item.audiences.answer")?.maxCodePoints).toBe(1200);
    expect(findCalebEditorRegion("/", "home.hero.image")?.maxCodePoints).toBe(240);
  });

  it("keeps Privacy view-only and the accepted receipt state locked", () => {
    const privacy = CALEB_EDITOR_SITE_CONFIG.pages.find((page) => page.path === "/privacy");
    const thankYou = CALEB_EDITOR_SITE_CONFIG.pages.find((page) => page.path === "/thank-you");

    expect(privacy?.regions).toEqual([]);
    expect(thankYou?.regions.map((region) => region.id)).toEqual([
      "thankYou.empty.eyebrow",
      "thankYou.empty.title",
      "thankYou.empty.body",
    ]);
    expect(
      CALEB_EDITOR_SITE_CONFIG.pages
        .flatMap((page) => page.regions)
        .some((region) => region.id.startsWith("thankYou.accepted")),
    ).toBe(false);
  });
});
