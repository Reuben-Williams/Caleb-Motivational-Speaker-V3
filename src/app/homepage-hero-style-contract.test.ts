import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const mobileStart = styles.indexOf("@media (max-width: 767px)");
const mobileEnd = styles.indexOf("@media (max-width: 380px)", mobileStart);
const mobileStyles = styles.slice(mobileStart, mobileEnd);
const desktopStyles = styles.slice(0, mobileStart);

describe("homepage hero portrait styles", () => {
  it("owns the responsive fade with a mobile-only alpha mask", () => {
    expect(mobileStyles).toMatch(/\.home-hero__portrait img\s*\{[^}]*mask-image:/s);
    expect(mobileStyles).toMatch(
      /\.home-hero__portrait img\s*\{[^}]*-webkit-mask-image:/s,
    );
    expect(desktopStyles).not.toMatch(/\.home-hero__portrait img\s*\{[^}]*mask-image:/s);
  });

  it("keeps the mobile portrait positioning inside the 767px boundary", () => {
    expect(mobileStyles).toMatch(/\.home-hero__portrait\s*\{[^}]*height:/s);
    expect(mobileStyles).toMatch(/\.home-hero__portrait img\s*\{[^}]*object-position:/s);
  });
});
