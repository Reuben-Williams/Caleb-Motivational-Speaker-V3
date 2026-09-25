import { describe, expect, it, vi } from "vitest";

import { createCalebMediaRouteHandler } from "./media-route-handler";

const asset = {
  id: "11111111-1111-4111-8111-111111111111",
  siteId: "69403015-bea5-493a-99e5-c33c808507e5",
  path: "/api/site-media/11111111-1111-4111-8111-111111111111",
  url: "/api/site-media/11111111-1111-4111-8111-111111111111",
  alt: "Caleb smiling",
  label: "Hero",
  mimeType: "image/jpeg",
  source: "upload" as const,
  width: 4,
  height: 3,
  userId: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-09-24T18:00:00.000Z",
};

function fixture() {
  const media = {
    list: vi.fn().mockResolvedValue([asset]),
    upload: vi.fn().mockResolvedValue({ status: "applied", asset }),
  };
  const runtime = {
    authorizeRead: vi.fn().mockResolvedValue({ media }),
    authorizeMutation: vi.fn().mockResolvedValue({
      media,
      idempotencyKey: "upload-a",
      grant: { correlationId: "33333333-3333-4333-8333-333333333333" },
    }),
  };
  return { media, runtime, handler: createCalebMediaRouteHandler({ resolveRuntime: async () => runtime }) };
}

describe("Caleb builder media route", () => {
  it("lists fixed-site assets through website preview authorization", async () => {
    const { handler, runtime } = fixture();
    const response = await handler(new Request("https://calebjakes.com/api/builder/media"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ assets: [asset] });
    expect(runtime.authorizeRead).toHaveBeenCalledWith(expect.any(Request), "website.preview.read");
  });

  it("binds a multipart upload to the server actor, correlation, and idempotency key", async () => {
    const { handler, runtime, media } = fixture();
    const form = new FormData();
    form.set("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "hero.jpg", { type: "image/jpeg" }));
    form.set("label", "Hero");
    form.set("alt", "Caleb smiling");
    form.set("regionId", "home.hero.image");
    const response = await handler(new Request("https://calebjakes.com/api/builder/media", {
      method: "POST",
      headers: { origin: "https://calebjakes.com", "idempotency-key": "upload-a" },
      body: form,
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "applied", asset });
    expect(runtime.authorizeMutation).toHaveBeenCalledWith(
      expect.any(Request), "website.media.upload", expect.objectContaining({ label: "Hero", alt: "Caleb smiling" }),
    );
    expect(media.upload).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "upload-a",
      correlationId: "33333333-3333-4333-8333-333333333333",
    }));
  });

  it("rejects missing alt and unexpected multipart fields before storage", async () => {
    const { handler, media } = fixture();
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1])], "hero.jpg", { type: "image/jpeg" }));
    form.set("label", "Hero");
    form.set("extra", "unsafe");
    const response = await handler(new Request("https://calebjakes.com/api/builder/media", { method: "POST", body: form }));
    expect(response.status).toBe(400);
    expect(media.upload).not.toHaveBeenCalled();
  });

  it("returns authentication required when the staff session is absent", async () => {
    const { handler, runtime } = fixture();
    runtime.authorizeRead.mockRejectedValueOnce(Object.assign(new Error("authentication_required"), {
      status: 401,
    }));

    const response = await handler(new Request("https://calebjakes.com/api/builder/media"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "authentication_required" });
  });
});
