import { describe, expect, it } from "vitest";

import { withBasePath } from "@/lib/base-path";

describe("withBasePath", () => {
  it("prefixes root-relative public assets for a repository Pages deployment", () => {
    expect(
      withBasePath(
        "/media/photos/caleb.webp",
        "/Caleb-Motivational-Speaker-V3/",
      ),
    ).toBe("/Caleb-Motivational-Speaker-V3/media/photos/caleb.webp");
  });

  it("leaves local development and external URLs unchanged", () => {
    expect(withBasePath("/media/photos/caleb.webp", "")).toBe(
      "/media/photos/caleb.webp",
    );
    expect(
      withBasePath(
        "https://example.com/caleb.webp",
        "/Caleb-Motivational-Speaker-V3",
      ),
    ).toBe("https://example.com/caleb.webp");
  });

  it("does not apply the configured prefix twice", () => {
    expect(
      withBasePath(
        "/Caleb-Motivational-Speaker-V3/media/caleb.webp",
        "/Caleb-Motivational-Speaker-V3",
      ),
    ).toBe("/Caleb-Motivational-Speaker-V3/media/caleb.webp");
  });
});
