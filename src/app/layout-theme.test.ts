import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("RootLayout color scheme bootstrap", () => {
  it("applies the deterministic server default before hydration", () => {
    const layoutSource = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain('data-color-scheme="cinematic"');
    expect(layoutSource).toContain("suppressHydrationWarning");
    expect(layoutSource).toContain('id="color-scheme-bootstrap"');
    expect(layoutSource).toContain('strategy="beforeInteractive"');
    expect(layoutSource.indexOf('id="color-scheme-bootstrap"')).toBeGreaterThan(
      layoutSource.indexOf("<body"),
    );
  });
});
