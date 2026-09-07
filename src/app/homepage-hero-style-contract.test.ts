import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const compactDesktopStart = styles.indexOf("@media (max-width: 1100px)");
const tabletStart = styles.indexOf("@media (max-width: 900px)");
const mobileStart = styles.indexOf("@media (max-width: 767px)");
const mobileEnd = styles.indexOf("@media (max-width: 380px)", mobileStart);
const mobileStyles = styles.slice(mobileStart, mobileEnd);
const baseStyles = styles.slice(0, compactDesktopStart);
const compactDesktopStyles = styles.slice(compactDesktopStart, tabletStart);
const tabletStyles = styles.slice(tabletStart, mobileStart);

describe("homepage hero portrait styles", () => {
  it("owns the responsive fade below the desktop breakpoint", () => {
    expect(tabletStyles).toMatch(/\.home-hero__portrait img\s*\{[^}]*mask-image:/s);
    expect(tabletStyles).toMatch(
      /\.home-hero__portrait img\s*\{[^}]*-webkit-mask-image:/s,
    );
    expect(baseStyles).not.toMatch(/\.home-hero__portrait img\s*\{[^}]*mask-image:/s);
    expect(compactDesktopStyles).not.toMatch(
      /\.home-hero__portrait img\s*\{[^}]*mask-image:/s,
    );
  });

  it("scales the mobile portrait down before a narrow viewport can crop Caleb's arms", () => {
    expect(mobileStyles).toMatch(
      /\.home-hero__portrait\s*\{[^}]*height:\s*min\(500px, 132vw\);/s,
    );
  });

  it("keeps the desktop portrait inside the viewport without shifting Caleb off-center", () => {
    expect(baseStyles).toMatch(
      /\.home-hero__portrait img\s*\{[^}]*object-position:\s*55% bottom;/s,
    );
    expect(compactDesktopStyles).toMatch(
      /\.home-hero__portrait\s*\{[^}]*right:\s*-4%;/s,
    );
  });

  it("stacks and centers the portrait before the copy on tablet and mobile", () => {
    expect(tabletStyles).toMatch(
      /\.home-hero__copy\s*\{[^}]*width:\s*100%;[^}]*padding:\s*calc\(min\(67vw, 560px\) \+ 2\.5rem\)/s,
    );
    expect(tabletStyles).toMatch(
      /\.home-hero__portrait\s*\{[^}]*right:\s*-8%;[^}]*left:\s*-8%;[^}]*width:\s*auto;[^}]*height:\s*min\(67vw, 560px\);/s,
    );
    expect(tabletStyles).toMatch(
      /\.home-hero__portrait img\s*\{[^}]*object-position:\s*center top;/s,
    );
    expect(mobileStyles).not.toMatch(
      /\.home-hero__portrait\s*\{[^}]*(?:right|left|width):/s,
    );
  });
});
