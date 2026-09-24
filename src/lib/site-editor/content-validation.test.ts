import { describe, expect, it } from "vitest";

import {
  CalebContentValidationError,
  validateCalebEditableValue,
} from "./content-validation";
import { findCalebEditorRegion } from "./site-config";

function region(path: string, id: string) {
  const found = findCalebEditorRegion(path, id);
  if (!found) throw new Error(`Missing test region ${path}:${id}`);
  return found;
}

function expectCode(run: () => unknown, code: CalebContentValidationError["code"]) {
  try {
    run();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CalebContentValidationError);
    expect((error as CalebContentValidationError).code).toBe(code);
  }
}

describe("Caleb editor content validation", () => {
  it("normalizes plain text and counts Unicode code points", () => {
    const value = validateCalebEditableValue(
      region("/", "home.hero.title.line1"),
      { type: "text", value: "  PAIN Cafe\u0301 😀  " },
      { phase: "publish" },
    );

    expect(value).toEqual({ type: "text", value: "PAIN Café 😀" });
  });

  it("permits an empty draft but fails closed for an empty required publish", () => {
    expect(
      validateCalebEditableValue(
        region("/", "home.hero.body"),
        { type: "text", value: "  " },
        { phase: "draft" },
      ),
    ).toEqual({ type: "text", value: "" });

    expectCode(
      () =>
        validateCalebEditableValue(
          region("/", "home.hero.body"),
          { type: "text", value: "  " },
          { phase: "publish" },
        ),
      "required_value_missing",
    );
  });

  it("rejects over-limit text using code-point length rather than UTF-16 units", () => {
    const eyebrow = region("/", "home.hero.eyebrow");
    expect(
      validateCalebEditableValue(
        eyebrow,
        { type: "text", value: "😀".repeat(120) },
        { phase: "publish" },
      ),
    ).toEqual({ type: "text", value: "😀".repeat(120) });

    expectCode(
      () =>
        validateCalebEditableValue(
          eyebrow,
          { type: "text", value: "😀".repeat(121) },
          { phase: "publish" },
        ),
      "value_too_long",
    );
  });

  it("rejects control characters, markup, alternate types, metadata, and extra keys", () => {
    const title = region("/", "home.hero.title.line1");
    expectCode(
      () => validateCalebEditableValue(title, { type: "text", value: "Bad\u0000value" }, { phase: "draft" }),
      "control_character_not_allowed",
    );
    expectCode(
      () => validateCalebEditableValue(title, { type: "text", value: "<strong>Bad</strong>" }, { phase: "draft" }),
      "markup_not_allowed",
    );
    expectCode(
      () => validateCalebEditableValue(title, { type: "text", value: "[Bad](https://example.com)" }, { phase: "draft" }),
      "markup_not_allowed",
    );
    expectCode(
      () => validateCalebEditableValue(title, { type: "richText", value: "Bad" }, { phase: "draft" }),
      "value_type_not_allowed",
    );
    expectCode(
      () => validateCalebEditableValue(title, { type: "text", value: "Bad", link: null }, { phase: "draft" }),
      "metadata_not_allowed",
    );
    expectCode(
      () => validateCalebEditableValue(title, { type: "text", value: "Bad", style: "gold" }, { phase: "draft" }),
      "metadata_not_allowed",
    );
  });

  it("canonicalizes approved seed images and rejects caller-controlled paths", () => {
    const image = region("/", "home.hero.image");
    expect(
      validateCalebEditableValue(
        image,
        {
          type: "image",
          mediaId: "seed-home-hero-cutout-v1",
          src: "/media/people/caleb-home-hero-cutout.webp",
          alt: "  Caleb Jakes smiling in a navy shirt with white stripes  ",
        },
        { phase: "publish" },
      ),
    ).toEqual({
      type: "image",
      mediaId: "seed-home-hero-cutout-v1",
      src: "/media/people/caleb-home-hero-cutout.webp",
      alt: "Caleb Jakes smiling in a navy shirt with white stripes",
    });

    expectCode(
      () =>
        validateCalebEditableValue(
          image,
          {
            type: "image",
            mediaId: "seed-home-hero-cutout-v1",
            src: "https://example.com/caleb.webp",
            alt: "Caleb Jakes",
          },
          { phase: "publish" },
        ),
      "image_src_not_allowed",
    );
    expectCode(
      () =>
        validateCalebEditableValue(
          image,
          {
            type: "image",
            mediaId: "missing-media",
            src: "/media/people/caleb-home-hero-cutout.webp",
            alt: "Caleb Jakes",
          },
          { phase: "publish" },
        ),
      "unknown_media",
    );
  });

  it("requires normalized image alt text and forbids link or presentation metadata", () => {
    const image = region("/", "home.hero.image");
    expectCode(
      () =>
        validateCalebEditableValue(
          image,
          {
            type: "image",
            mediaId: "seed-home-hero-cutout-v1",
            src: "/media/people/caleb-home-hero-cutout.webp",
            alt: "",
          },
          { phase: "draft" },
        ),
      "required_value_missing",
    );
    expectCode(
      () =>
        validateCalebEditableValue(
          image,
          {
            type: "image",
            mediaId: "seed-home-hero-cutout-v1",
            src: "/media/people/caleb-home-hero-cutout.webp",
            alt: "x".repeat(241),
          },
          { phase: "publish" },
        ),
      "value_too_long",
    );
    expectCode(
      () =>
        validateCalebEditableValue(
          image,
          {
            type: "image",
            mediaId: "seed-home-hero-cutout-v1",
            src: "/media/people/caleb-home-hero-cutout.webp",
            alt: "Caleb Jakes",
            link: null,
          },
          { phase: "publish" },
        ),
      "metadata_not_allowed",
    );
  });

  it("rejects a value whose type does not match its region", () => {
    expectCode(
      () =>
        validateCalebEditableValue(
          region("/", "home.hero.image"),
          { type: "text", value: "Not an image" },
          { phase: "draft" },
        ),
      "value_type_mismatch",
    );
  });
});
