import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
).toLowerCase();

function blockFor(selector: string) {
  const start = css.indexOf(`${selector.toLowerCase()} {`);
  expect(start, `missing ${selector} theme block`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf("}", start);
  return css.slice(start, end + 1);
}

const cinematicTokens = {
  "--theme-page": "#050505",
  "--theme-page-rgb": "5 5 5",
  "--theme-surface": "#131313",
  "--theme-surface-rgb": "19 19 19",
  "--theme-surface-soft": "#201f1f",
  "--theme-surface-soft-rgb": "32 31 31",
  "--theme-text": "#fdfcf8",
  "--theme-text-rgb": "253 252 248",
  "--theme-muted": "#d0c5af",
  "--theme-muted-rgb": "208 197 175",
  "--theme-accent": "#d4af37",
  "--theme-accent-rgb": "212 175 55",
  "--theme-accent-contrast": "#050505",
  "--theme-accent-contrast-rgb": "5 5 5",
  "--theme-inverse-text": "#050505",
  "--theme-inverse-text-rgb": "5 5 5",
  "--theme-secondary-accent": "#2e5bff",
  "--theme-secondary-accent-rgb": "46 91 255",
  "--theme-tertiary-accent": "#630d16",
  "--theme-tertiary-accent-rgb": "99 13 22",
  "--theme-border": "rgb(253 252 248 / 0.18)",
  "--theme-focus": "#2e5bff",
  "--theme-shadow-rgb": "0 0 0",
  "--theme-media-surface": "#0a0a0a",
  "--theme-media-placeholder": "#bbb",
  "--theme-video-background": "#000",
};

const originalTokens = {
  "--theme-page": "#02017d",
  "--theme-page-rgb": "2 1 125",
  "--theme-surface": "#0b0a68",
  "--theme-surface-rgb": "11 10 104",
  "--theme-surface-soft": "#17165a",
  "--theme-surface-soft-rgb": "23 22 90",
  "--theme-text": "#ffffff",
  "--theme-text-rgb": "255 255 255",
  "--theme-muted": "#ffffff",
  "--theme-muted-rgb": "255 255 255",
  "--theme-accent": "#f1dd18",
  "--theme-accent-rgb": "241 221 24",
  "--theme-accent-contrast": "#1f2937",
  "--theme-accent-contrast-rgb": "31 41 55",
  "--theme-inverse-text": "#1f2937",
  "--theme-inverse-text-rgb": "31 41 55",
  "--theme-secondary-accent": "#ffffff",
  "--theme-secondary-accent-rgb": "255 255 255",
  "--theme-tertiary-accent": "#f1dd18",
  "--theme-tertiary-accent-rgb": "241 221 24",
  "--theme-border": "rgb(255 255 255 / 0.24)",
  "--theme-focus": "#f1dd18",
  "--theme-shadow-rgb": "0 0 0",
  "--theme-media-surface": "#0b0a68",
  "--theme-media-placeholder": "#ffffff",
  "--theme-video-background": "#000",
};

describe("global theme contract", () => {
  it("defines the complete cinematic and original token mappings", () => {
    const cinematic = blockFor(":root");
    const original = blockFor('html[data-color-scheme="original"]');

    for (const [token, value] of Object.entries(cinematicTokens)) {
      expect(cinematic).toContain(`${token}: ${value};`);
    }
    for (const [token, value] of Object.entries(originalTokens)) {
      expect(original).toContain(`${token}: ${value};`);
    }
  });

  it("keeps raw theme colors inside the declaration boundary", () => {
    const withoutThemeDeclarations = css
      .replace(blockFor(":root"), "")
      .replace(blockFor('html[data-color-scheme="original"]'), "")
      .replaceAll("#ff786f", "")
      .replaceAll("#ff9c94", "")
      .replaceAll("#ffb14a", "");

    const forbiddenSolid =
      /#(?:000(?:000)?|050505|0a0a0a|131313|201f1f|2e5bff|630d16|bbb|d0c5af|d4af37|fdfcf8)\b/g;
    const forbiddenChannels =
      /rgba?\(\s*(?:0\s*,\s*0\s*,\s*0|5\s*,\s*5\s*,\s*5|10\s*,\s*10\s*,\s*10|19\s*,\s*19\s*,\s*19|32\s*,\s*31\s*,\s*31|46\s*,\s*91\s*,\s*255|99\s*,\s*13\s*,\s*22|187\s*,\s*187\s*,\s*187|208\s*,\s*197\s*,\s*175|212\s*,\s*175\s*,\s*55|253\s*,\s*252\s*,\s*248)\b/g;

    expect(withoutThemeDeclarations.match(forbiddenSolid) ?? []).toEqual([]);
    expect(withoutThemeDeclarations.match(forbiddenChannels) ?? []).toEqual(
      [],
    );
  });

  it("gives the responsive theme controls an accessible, stable layout", () => {
    expect(css).toMatch(
      /\.color-scheme-toggle\s*\{[^}]*min-height:\s*44px;[^}]*\}/s,
    );
    expect(css).toMatch(
      /\.color-scheme-toggle--mobile\s*\{\s*display:\s*none;\s*\}/s,
    );
    expect(css).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.color-scheme-toggle--desktop\s*\{\s*display:\s*none;\s*\}/,
    );
    expect(css).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*?\.color-scheme-toggle--mobile\s*\{[^}]*display:\s*inline-flex;/,
    );
  });

  it("keeps the animated stage atmosphere legible on the original navy", () => {
    expect(css).toMatch(
      /html\[data-color-scheme="original"\]\s+\.hero-atmosphere\[data-enabled="true"\]\s*\{[^}]*mix-blend-mode:\s*screen;/s,
    );
  });
});
