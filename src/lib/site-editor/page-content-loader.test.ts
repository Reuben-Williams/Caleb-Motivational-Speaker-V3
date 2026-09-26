import { describe, expect, it, vi } from "vitest";
const connection = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("next/server", () => ({ connection }));

import {
  loadCalebPublishedPageContent,
} from "./page-content-loader";

describe("public Caleb page content loading", () => {
  it("waits for the request before querying and never swallows a rendering bailout", async () => {
    const loadPublished = vi.fn();
    const bailout = new Error("rendering bailout");
    connection.mockRejectedValueOnce(bailout);
    await expect(loadCalebPublishedPageContent("/", { loadPublished })).rejects.toBe(bailout);
    expect(loadPublished).not.toHaveBeenCalled();
  });
  it("uses the exact code fallback when the published store is unavailable", async () => {
    const diagnostic = vi.fn();
    const content = await loadCalebPublishedPageContent("/about", {
      loadPublished: async () => {
        throw new Error("database unavailable");
      },
      reportDiagnostic: diagnostic,
    });

    expect(content.regions["about.hero.title"]).toEqual({
      type: "text",
      value: "FROM THE STRUGGLE TO THE CALLING.",
    });
    expect(diagnostic).toHaveBeenCalledWith({
      code: "published_content_unavailable",
      pagePath: "/about",
    });
  });

  it("never resolves draft content through the public loader", async () => {
    const loadPublished = vi.fn(async () => ({
      path: "/",
      regions: {
        "home.hero.title.line1": { type: "text" as const, value: "PUBLISHED" },
      },
    }));

    const content = await loadCalebPublishedPageContent("/", { loadPublished });

    expect(content.regions["home.hero.title.line1"]).toEqual({
      type: "text",
      value: "PUBLISHED",
    });
    expect(loadPublished).toHaveBeenCalledWith("/");
  });
});
