import { describe, expect, it, vi } from "vitest";

import { createCalebContentRouteHandler } from "./content-route-handler";

const VERSION = {
  id: "11111111-1111-4111-8111-111111111111",
  siteId: "69403015-bea5-493a-99e5-c33c808507e5",
  pagePath: "/",
  status: "draft",
  snapshot: { path: "/", regions: {} },
  userId: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-09-24T16:00:00.000Z",
} as const;

function fixture() {
  const adapter = {
    getContentState: vi.fn().mockResolvedValue({
      content: { path: "/", regions: {} },
      draftVersionId: VERSION.id,
      publishedVersionId: null,
    }),
    listVersions: vi.fn().mockResolvedValue([VERSION]),
    listAuditLog: vi.fn().mockResolvedValue([]),
    saveDraftCommand: vi.fn().mockResolvedValue({
      status: "applied",
      version: VERSION,
      draftVersionId: VERSION.id,
      publishedVersionId: null,
      correlationId: "33333333-3333-4333-8333-333333333333",
    }),
    publishCommand: vi.fn().mockResolvedValue({
      status: "applied",
      version: { ...VERSION, status: "published" },
      draftVersionId: VERSION.id,
      publishedVersionId: "44444444-4444-4444-8444-444444444444",
      correlationId: "33333333-3333-4333-8333-333333333333",
      revalidation: "pending",
    }),
    rollbackCommand: vi.fn().mockResolvedValue({ status: "applied", version: VERSION }),
    undoRollbackCommand: vi.fn().mockResolvedValue({ status: "applied", version: VERSION }),
  };
  const grant = {
    siteId: VERSION.siteId,
    subject: VERSION.userId,
    correlationId: "33333333-3333-4333-8333-333333333333",
  };
  const runtime = {
    authorizeRead: vi.fn().mockResolvedValue({ grant, adapter }),
    authorizeMutation: vi.fn().mockResolvedValue({
      grant,
      adapter,
      media: { delivery: vi.fn().mockResolvedValue({ asset: { id: "media-a" } }) },
      idempotencyKey: "command-a",
      replay: false,
    }),
  };
  return { adapter, runtime, handler: createCalebContentRouteHandler({
    resolveRuntime: async () => runtime,
  }) };
}

function mutation(method: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://calebjakes.com/api/builder/content", {
    method,
    headers: {
      origin: "https://calebjakes.com",
      cookie: "builder_csrf=csrf-a",
      "x-csrf-token": "csrf-a",
      "idempotency-key": "command-a",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Caleb content route", () => {
  it("reads draft state and history through separate Website operations", async () => {
    const draft = fixture();
    const draftResponse = await draft.handler(new Request(
      "https://calebjakes.com/api/builder/content?path=%2F&mode=draft",
    ));
    expect(draftResponse.status).toBe(200);
    expect(await draftResponse.json()).toMatchObject({ draftVersionId: VERSION.id });
    expect(draft.runtime.authorizeRead).toHaveBeenCalledWith(
      expect.any(Request),
      "website.preview.read",
    );

    const history = fixture();
    const historyResponse = await history.handler(new Request(
      "https://calebjakes.com/api/builder/content?path=%2F&resource=history",
    ));
    expect(await historyResponse.json()).toEqual({ versions: [VERSION], audit: [] });
    expect(history.runtime.authorizeRead).toHaveBeenCalledWith(
      expect.any(Request),
      "website.history.read",
    );
  });

  it("binds save, publish, rollback, and undo to server-derived command facts", async () => {
    const save = fixture();
    await save.handler(mutation("POST", {
      action: "saveDraft",
      pagePath: "/",
      regionId: "home.hero.title",
      value: { type: "text", text: "New title" },
      expectedDraftVersionId: VERSION.id,
    }));
    expect(save.runtime.authorizeMutation).toHaveBeenCalledWith(
      expect.any(Request),
      "website.draft.save",
      expect.objectContaining({ action: "saveDraft" }),
    );
    expect(save.adapter.saveDraftCommand).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "command-a",
      correlationId: "33333333-3333-4333-8333-333333333333",
    }));

    const publish = fixture();
    const published = await publish.handler(mutation("PUT", {
      pagePath: "/",
      expectedDraftVersionId: VERSION.id,
      expectedPublishedVersionId: null,
    }));
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ revalidation: "pending" });
    expect(publish.runtime.authorizeMutation).toHaveBeenCalledWith(
      expect.any(Request),
      "website.publish",
      expect.any(Object),
    );

    const rollback = fixture();
    await rollback.handler(mutation("PATCH", {
      action: "rollback",
      pagePath: "/",
      versionId: VERSION.id,
      expectedPublishedVersionId: null,
    }));
    expect(rollback.runtime.authorizeMutation).toHaveBeenCalledWith(
      expect.any(Request),
      "website.rollback",
      expect.any(Object),
    );
    expect(rollback.adapter.rollbackCommand).toHaveBeenCalledOnce();

    const undo = fixture();
    await undo.handler(mutation("PATCH", {
      action: "undoRollback",
      pagePath: "/",
      rollbackVersionId: VERSION.id,
      expectedPublishedVersionId: null,
    }));
    expect(undo.adapter.undoRollbackCommand).toHaveBeenCalledOnce();
  });

  it("rejects undeclared fields, wrong methods, oversized JSON, and stale versions safely", async () => {
    const undeclared = fixture();
    expect((await undeclared.handler(mutation("POST", {
      action: "saveDraft",
      pagePath: "/",
      regionId: "home.hero.title",
      value: { type: "text", text: "New title" },
      expectedDraftVersionId: null,
      siteId: VERSION.siteId,
    }))).status).toBe(400);
    expect(undeclared.runtime.authorizeMutation).not.toHaveBeenCalled();

    const wrongMethod = fixture();
    expect((await wrongMethod.handler(new Request(
      "https://calebjakes.com/api/builder/content",
      { method: "DELETE" },
    ))).status).toBe(405);

    const oversized = fixture();
    expect((await oversized.handler(mutation("POST", {}, {
      "content-length": String(65 * 1024),
    }))).status).toBe(413);

    const stale = fixture();
    stale.adapter.publishCommand.mockRejectedValueOnce(Object.assign(
      new Error("conflict"),
      { code: "CONTENT_VERSION_CONFLICT", httpStatus: 409 },
    ));
    const response = await stale.handler(mutation("PUT", {
      pagePath: "/",
      expectedDraftVersionId: VERSION.id,
      expectedPublishedVersionId: null,
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "CONTENT_VERSION_CONFLICT" });
  });
});
