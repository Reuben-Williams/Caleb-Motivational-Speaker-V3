import { describe, expect, it, vi } from "vitest";

import {
  resolveCalebDraftContent,
  resolveCalebPublishedContent,
  validateCalebPageOverrides,
} from "./content-resolution";

describe("Caleb site content resolution", () => {
  it("returns the complete code-authored fallback when no override exists", () => {
    const content = resolveCalebPublishedContent("/", null);

    expect(content.path).toBe("/");
    expect(content.regions["home.hero.title.line1"]).toEqual({
      type: "text",
      value: "PAIN HAS",
    });
    expect(content.regions["home.hero.image"]).toEqual({
      type: "image",
      mediaId: "seed-home-hero-cutout-v1",
      src: "/media/people/caleb-home-hero-cutout.webp",
      alt: "Caleb Jakes smiling in a navy shirt with white stripes",
    });
  });

  it("layers valid published overrides over fallback and ignores invalid public values", () => {
    const diagnostic = vi.fn();
    const content = resolveCalebPublishedContent(
      "/",
      {
        path: "/",
        versionId: "4be7f17d-a8e1-45cc-a0f1-f2aa6bf4a00b",
        regions: {
          "home.hero.title.line1": { type: "text", value: "PURPOSE STARTS HERE" },
          "home.hero.body": { type: "richText", value: "<b>unsafe</b>" },
          "not.declared": { type: "text", value: "never render" },
        },
      },
      { reportDiagnostic: diagnostic },
    );

    expect(content.versionId).toBe("4be7f17d-a8e1-45cc-a0f1-f2aa6bf4a00b");
    expect(content.regions["home.hero.title.line1"]).toEqual({
      type: "text",
      value: "PURPOSE STARTS HERE",
    });
    expect(content.regions["home.hero.body"]).not.toEqual({
      type: "richText",
      value: "<b>unsafe</b>",
    });
    expect(content.regions).not.toHaveProperty("not.declared");
    expect(diagnostic).toHaveBeenCalledWith({
      code: "invalid_published_override",
      pagePath: "/",
      regionId: "home.hero.body",
    });
    expect(diagnostic).toHaveBeenCalledWith({
      code: "undeclared_published_override",
      pagePath: "/",
      regionId: "not.declared",
    });
  });

  it("layers draft over published over fallback without leaking a draft into public resolution", () => {
    const published = {
      path: "/about",
      versionId: "9148fb42-49bd-43f6-93ad-c35c092be5ac",
      regions: {
        "about.hero.title": { type: "text" as const, value: "PUBLISHED TITLE" },
      },
    };
    const draft = {
      path: "/about",
      versionId: "476b1474-909c-4aba-9c15-a8f8af124152",
      regions: {
        "about.hero.title": { type: "text" as const, value: "DRAFT TITLE" },
      },
    };

    expect(resolveCalebPublishedContent("/about", published).regions["about.hero.title"]).toEqual({
      type: "text",
      value: "PUBLISHED TITLE",
    });
    const preview = resolveCalebDraftContent("/about", published, draft);
    expect(preview.regions["about.hero.title"]).toEqual({
      type: "text",
      value: "DRAFT TITLE",
    });
    expect(preview.versionId).toBe("476b1474-909c-4aba-9c15-a8f8af124152");
  });

  it("fails closed when a mutation snapshot contains invalid or undeclared overrides", () => {
    expect(() =>
      validateCalebPageOverrides("/", {
        "home.hero.title.line1": { type: "text", value: "<strong>unsafe</strong>" },
      }),
    ).toThrowError("invalid_content_override");

    expect(() =>
      validateCalebPageOverrides("/", {
        "not.declared": { type: "text", value: "unknown" },
      }),
    ).toThrowError("undeclared_content_override");
  });

  it("rejects an undeclared page path", () => {
    expect(() => resolveCalebPublishedContent("/not-a-page", null)).toThrowError(
      "undeclared_page_path",
    );
  });
});
