import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const homepageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");

describe("homepage hero contract", () => {
  it("uses the approved authentic cutout with truthful alternative text", () => {
    expect(homepageSource).toContain(
      'src={withBasePath("/media/people/caleb-home-hero-cutout.webp")}',
    );
    expect(homepageSource).toContain(
      'alt="Caleb Jakes smiling in a navy shirt with white stripes"',
    );
    expect(homepageSource).not.toContain(
      'alt="Caleb Jakes speaking into a handheld microphone"',
    );
  });

  it("preserves the approved headline and calls to action", () => {
    expect(homepageSource).toContain("PAIN HAS");
    expect(homepageSource).toContain("PURPOSE.");
    expect(homepageSource).toContain("Book Caleb");
    expect(homepageSource).toContain("Watch the Speaker Reel");
  });
});
