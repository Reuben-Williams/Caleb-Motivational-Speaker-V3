import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("RootLayout accessibility contract", () => {
  it("makes the main fragment target programmatically focusable", () => {
    const layoutSource = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );

    expect(layoutSource).toMatch(
      /<main\s+id="main-content"\s+tabIndex=\{-1\}>/,
    );
  });
});
