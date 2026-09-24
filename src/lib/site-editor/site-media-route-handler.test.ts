import { describe, expect, it, vi } from "vitest";

import { createCalebSiteMediaRouteHandler } from "./site-media-route-handler";

const upload = {
  asset: {
    id: "asset-a", siteId: "site-a", path: "/api/site-media/asset-a", url: "/api/site-media/asset-a",
    alt: "Caleb smiling", label: "Hero", mimeType: "image/webp", source: "upload" as const,
    width: 100, height: 100, userId: "actor-a", createdAt: "2026-09-24T18:00:00.000Z",
  },
  objectKey: "site-a/private.webp",
  published: false,
  draft: true,
};

function handler(input: { published?: boolean; authenticated?: boolean; seed?: boolean } = {}) {
  const publicStore = {
    delivery: vi.fn().mockResolvedValue({ ...upload, published: input.published ?? false }),
    bytes: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
  };
  const draftStore = {
    delivery: vi.fn().mockResolvedValue(upload),
    bytes: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
  };
  return createCalebSiteMediaRouteHandler({
    resolveSeed: async () => input.seed ? { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/webp" } : null,
    resolvePublicStore: () => publicStore,
    authorizeDraftStore: async () => input.authenticated ? draftStore : null,
  });
}

describe("first-party Caleb media delivery", () => {
  it("serves seeded and published assets with immutable public caching", async () => {
    const seeded = await handler({ seed: true })(new Request("https://calebjakes.com/api/site-media/seed"), "seed");
    expect(seeded.status).toBe(200);
    expect(seeded.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(seeded.headers.get("x-content-type-options")).toBe("nosniff");

    const published = await handler({ published: true })(new Request("https://calebjakes.com/api/site-media/asset-a"), "asset-a");
    expect(published.status).toBe(200);
    expect(published.headers.get("cache-control")).toContain("immutable");
  });

  it("hides draft-only bytes from unauthenticated and cross-site requests", async () => {
    const response = await handler()(new Request("https://calebjakes.com/api/site-media/asset-a"), "asset-a");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("serves an authenticated draft privately without caching", async () => {
    const response = await handler({ authenticated: true })(new Request("https://calebjakes.com/api/site-media/asset-a"), "asset-a");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
