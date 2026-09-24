import { describe, expect, it } from "vitest";

import { calebPreviewPath, publicPathFromPreviewSegments } from "./preview-paths";

describe("Caleb private preview paths", () => {
  it("maps the empty optional catch-all and declared nested routes canonically", () => {
    expect(publicPathFromPreviewSegments()).toBe("/");
    expect(publicPathFromPreviewSegments([])).toBe("/");
    expect(publicPathFromPreviewSegments(["book-media"])).toBe("/book-media");
    expect(calebPreviewPath("/schools-colleges")).toBe("/admin/editor/preview/schools-colleges");
  });

  it("fails closed for undeclared, malformed, or traversal paths", () => {
    expect(() => publicPathFromPreviewSegments(["unknown"])).toThrow("PREVIEW_PAGE_UNDECLARED");
    expect(() => publicPathFromPreviewSegments(["..", "privacy"])).toThrow("PREVIEW_PAGE_UNDECLARED");
    expect(() => calebPreviewPath("https://attacker.example")).toThrow("PREVIEW_PAGE_UNDECLARED");
  });
});
