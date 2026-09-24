import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CalebAttachedWebsiteEditor } from "./caleb-attached-website-editor";

describe("Caleb attached website editor", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("makes Website the default while preserving Speaking Engagements and responsive navigation", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return new Response(JSON.stringify(url.includes("/media") ? { assets: [] } : {
        content: { path: "/", regions: {} }, draftVersionId: null, publishedVersionId: null,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));
    render(<CalebAttachedWebsiteEditor />);
    expect(screen.getByRole("heading", { name: /Edit the live Caleb Jakes website/i })).toBeInTheDocument();
    expect(screen.getAllByText("Speaking Engagements").length).toBeGreaterThan(0);
    expect(document.querySelector('[data-builder-navigation-surface="desktop"]')).toBeTruthy();
    expect(document.querySelector('[data-builder-navigation-surface="tablet"]')).toBeTruthy();
    expect(document.querySelector('[data-builder-navigation-surface="mobile-bottom"]')).toBeTruthy();
    expect(screen.getByTitle("/ draft preview")).toHaveAttribute("src", "/admin/editor/preview");
  });
});
