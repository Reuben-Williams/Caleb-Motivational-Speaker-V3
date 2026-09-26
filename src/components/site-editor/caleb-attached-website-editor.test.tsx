import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CalebAttachedWebsiteEditor } from "./caleb-attached-website-editor";
import { createBuilderPreviewMessage } from "@reuben-williams/core";

describe("Caleb attached website editor", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("waits for the trusted preview readiness and requires no authenticator panel", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => Response.json(
      String(input).includes("/media") ? { assets: [] } : { draftVersionId: null, publishedVersionId: null },
    )));
    render(<CalebAttachedWebsiteEditor />);
    await screen.findByText("Draft loaded.");
    expect(screen.queryByText("Verify publishing access")).not.toBeInTheDocument();
    expect(screen.getByText("Loading interactive preview…")).toBeInTheDocument();
    const frame = screen.getByTitle("/ draft preview") as HTMLIFrameElement;
    const data = createBuilderPreviewMessage("ce607bf6-2959-4d7e-b52a-31a8d21b1db2", { type: "builder:ready", pagePath: "/" });
    fireEvent(window, new MessageEvent("message", { origin: window.location.origin, source: window, data }));
    expect(screen.queryByText("Preview ready. Select outlined text or an image to edit.")).not.toBeInTheDocument();
    fireEvent(window, new MessageEvent("message", { origin: window.location.origin, source: frame.contentWindow, data }));
    expect(screen.getByText("Preview ready. Select outlined text or an image to edit.")).toBeInTheDocument();
  });

  it("obtains a CSRF token and refreshes the private preview after saving a draft", async () => {
    document.cookie = "builder_csrf=; max-age=0; path=/";
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const body = url === "/api/admin/csrf" ? { token: "test-csrf" }
        : init?.method === "POST" ? { draftVersionId: "draft-one" }
          : url.includes("/media") ? { assets: [] }
            : { draftVersionId: null, publishedVersionId: null };
      return Response.json(body);
    });
    vi.stubGlobal("fetch", fetch);
    render(<CalebAttachedWebsiteEditor />);
    await screen.findByText("Draft loaded.");
    const frame = screen.getByTitle("/ draft preview") as HTMLIFrameElement;
    fireEvent(window, new MessageEvent("message", {
      origin: window.location.origin, source: frame.contentWindow,
      data: createBuilderPreviewMessage("ce607bf6-2959-4d7e-b52a-31a8d21b1db2", {
        type: "builder:select-region", pagePath: "/", regionId: "home.hero.title.line1", kind: "text", value: "PAIN HAS",
      }),
    }));
    fireEvent.change(screen.getByRole("textbox", { name: /^Text$/ }), { target: { value: "PREVIEW TEST" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Draft saved. The public site has not changed.");
    expect(fetch).toHaveBeenCalledWith("/api/admin/csrf", expect.any(Object));
    expect(fetch).toHaveBeenCalledWith("/api/builder/content", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-csrf-token": "test-csrf" }),
    }));
    expect(screen.getByTitle("/ draft preview")).not.toBe(frame);
  });

  it("rejects region selections from another window or a wrong region kind", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => Response.json(
      String(input).includes("/media") ? { assets: [] } : { draftVersionId: null, publishedVersionId: null },
    )));
    render(<CalebAttachedWebsiteEditor />);
    await screen.findByText("Draft loaded.");
    const frame = screen.getByTitle("/ draft preview") as HTMLIFrameElement;
    const data = createBuilderPreviewMessage("ce607bf6-2959-4d7e-b52a-31a8d21b1db2", {
      type: "builder:select-region", pagePath: "/", regionId: "home.hero.title.line1", kind: "text", value: "Injected",
    });
    fireEvent(window, new MessageEvent("message", { origin: window.location.origin, source: window, data }));
    expect(screen.queryByRole("textbox", { name: /^Text$/ })).not.toBeInTheDocument();
    fireEvent(window, new MessageEvent("message", { origin: window.location.origin, source: frame.contentWindow, data: { ...data, kind: "image" } }));
    expect(screen.queryByLabelText("Alternative text")).not.toBeInTheDocument();
  });

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

  it("switches the private preview among desktop, tablet, and mobile widths", () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => new Response(JSON.stringify(
      String(input).includes("/media") ? { assets: [] } : {
        content: { path: "/", regions: {} }, draftVersionId: null, publishedVersionId: null,
      },
    ), { status: 200, headers: { "content-type": "application/json" } })));
    render(<CalebAttachedWebsiteEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Mobile preview" }));
    expect(screen.getByTestId("website-preview-frame")).toHaveAttribute("data-viewport", "mobile");
    fireEvent.click(screen.getByRole("button", { name: "Tablet preview" }));
    expect(screen.getByTestId("website-preview-frame")).toHaveAttribute("data-viewport", "tablet");
  });

  it("loads version history and sends a protected restore command", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/admin/csrf") return Response.json({ token: "test-csrf" });
      if (url.includes("resource=history")) return new Response(JSON.stringify({
        versions: [{
          id: "11111111-1111-4111-8111-111111111111", siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
          pagePath: "/", status: "published", snapshot: { path: "/", regions: {} },
          createdAt: "2026-09-24T12:00:00.000Z",
        }],
        audit: [],
      }), { status: 200, headers: { "content-type": "application/json" } });
      if (init?.method === "PATCH") return new Response(JSON.stringify({
        publishedVersionId: "22222222-2222-4222-8222-222222222222",
        draftVersionId: null,
        correlationId: "33333333-3333-4333-8333-333333333333",
      }), { status: 200, headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify(url.includes("/media") ? { assets: [] } : {
        content: { path: "/", regions: {} }, draftVersionId: null, publishedVersionId: null,
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetch);
    render(<CalebAttachedWebsiteEditor />);

    fireEvent.click(screen.getAllByText("History")[0]);
    expect(await screen.findByText("Published version")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore this version" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/builder/content",
      expect.objectContaining({ method: "PATCH" }),
    ));
  });
});
