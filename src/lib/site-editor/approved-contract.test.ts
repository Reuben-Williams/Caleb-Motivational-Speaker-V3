import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SITE_CONFIG_PATH = resolve("src/lib/site-editor/site-config.ts");
const NEXT_CONFIG_PATH = resolve("next.config.ts");

function siteConfigSource(): string {
  return existsSync(SITE_CONFIG_PATH) ? readFileSync(SITE_CONFIG_PATH, "utf8") : "";
}

function nextConfigSource(): string {
  return existsSync(NEXT_CONFIG_PATH) ? readFileSync(NEXT_CONFIG_PATH, "utf8") : "";
}

describe("Caleb attached editor approved contract", () => {
  it("defines the reviewed migration and schema identity", () => {
    const source = siteConfigSource();

    expect(source).toContain("0015_caleb_attached_site_editor.sql");
    expect(source).toContain("builder: 2");
    expect(source).toContain("forms: 2");
    expect(source).toContain("growth: 1");
  });

  it("keeps global regions empty and limits values to text and images", () => {
    const source = siteConfigSource();

    expect(source).toMatch(/globalRegions\s*:\s*\[\s*\]/);
    expect(source).toContain('kind: "text"');
    expect(source).toContain('kind: "image"');
    expect(source).not.toContain('kind: "richText"');
    expect(source).not.toContain('kind: "video"');
    expect(source).not.toContain('kind: "link"');
  });

  it("keeps privacy view-only and locks receipt-state content", () => {
    const source = siteConfigSource();

    expect(source).toContain('path: "/privacy"');
    expect(source).toContain("regions: []");
    expect(source).not.toContain("thankYou.accepted");
  });

  it("packages the Linux Sharp runtime for editor and media functions", () => {
    const source = nextConfigSource();

    expect(source).toContain('"./node_modules/@img/sharp-linux-x64/**/*"');
    expect(source).toContain('"./node_modules/@img/sharp-libvips-linux-x64/**/*"');
    expect(source).toContain('"/admin/editor"');
    expect(source).toContain('"/admin/editor/website"');
    expect(source).toContain('"/admin/editor/preview/**"');
    expect(source).toContain('"/api/builder/content"');
    expect(source).toContain('"/api/builder/media"');
    expect(source).toContain('"/api/builder/revalidation"');
    expect(source).toContain('"/api/builder/workers/revalidation"');
    expect(source).toContain('"/api/site-media/**"');
  });
});
