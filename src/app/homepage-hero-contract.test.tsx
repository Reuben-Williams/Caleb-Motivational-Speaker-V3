import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const homepageSource = readFileSync(
  join(process.cwd(), "src/components/site-pages/home-page-view.tsx"),
  "utf8",
);
const contentSource = readFileSync(
  join(process.cwd(), "src/lib/site-editor/site-config.ts"),
  "utf8",
);
const mediaSource = readFileSync(
  join(process.cwd(), "src/lib/site-editor/media-seed-catalog.ts"),
  "utf8",
);

describe("homepage hero contract", () => {
  it("uses the approved authentic cutout with truthful alternative text", () => {
    expect(homepageSource).toContain('regionId="home.hero.image"');
    expect(contentSource).toContain('seed-home-hero-cutout-v1');
    expect(mediaSource).toContain('/media/people/caleb-home-hero-cutout.webp');
    expect(mediaSource).toContain('Caleb Jakes smiling in a navy shirt with white stripes');
    expect(mediaSource).not.toContain('Caleb Jakes speaking into a handheld microphone');
  });

  it("preserves the approved headline and calls to action", () => {
    expect(contentSource).toContain("PAIN HAS");
    expect(contentSource).toContain("PURPOSE.");
    expect(homepageSource).toContain("Book Caleb");
    expect(homepageSource).toContain("Watch the Speaker Reel");
  });
});
