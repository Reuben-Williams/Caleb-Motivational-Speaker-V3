import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

import {
  CalebMediaStoreError,
  PostgresMediaStore,
  inspectCalebImageUpload,
} from "./media-store";

const siteId = "69403015-bea5-493a-99e5-c33c808507e5";
const actorId = "4c401b42-444c-4bd4-a120-001bb250f2d9";
const now = "2026-09-24T18:00:00.000Z";
const assetId = "11111111-1111-4111-8111-111111111111";
const correlationId = "22222222-2222-4222-8222-222222222222";
const session = { siteId, memberId: actorId, capabilities: ["media.upload"] };

async function image(format: "jpeg" | "png" | "webp") {
  return sharp({ create: { width: 4, height: 3, channels: 4, background: "#d9b929" } })
    [format]().toBuffer();
}

function uploadFile(bytes: Buffer, type: string) {
  return new File([new Uint8Array(bytes)], `caleb.${type.split("/")[1]}`, { type });
}

function fixture(options: { failInsert?: boolean; inspect?: () => Promise<{ mimeType: "image/jpeg"; width: number; height: number }> } = {}) {
  const queries: string[] = [];
  const database = {
    withSession: vi.fn(async (_session, operation) => operation({
      ...session,
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes("builder_content_command_receipts") && sql.includes("select")) {
          return { rows: [], rowCount: 0 };
        }
        if (options.failInsert && sql.includes("insert into public.builder_media_assets")) {
          throw new Error("metadata unavailable");
        }
        return { rows: [], rowCount: 1 };
      }),
    })),
  };
  const storage = {
    upload: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  const store = new PostgresMediaStore({
    database,
    session,
    storage,
    now: () => now,
    randomUUID: vi.fn()
      .mockReturnValueOnce(assetId)
      .mockReturnValueOnce(correlationId),
    inspectImage: options.inspect,
  });
  return { store, storage, queries };
}

describe("Caleb private media store", () => {
  it.each([
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
  ] as const)("accepts decoded %s bytes with a matching MIME signature", async (format, mimeType) => {
    const result = await inspectCalebImageUpload(uploadFile(await image(format), mimeType));
    expect(result).toMatchObject({ mimeType, width: 4, height: 3 });
  });

  it("rejects MIME mismatch, malformed content, and the 10 MiB boundary", async () => {
    await expect(inspectCalebImageUpload(uploadFile(await image("png"), "image/jpeg")))
      .rejects.toMatchObject({ code: "MEDIA_MIME_MISMATCH" });
    await expect(inspectCalebImageUpload(uploadFile(Buffer.from("not an image"), "image/png")))
      .rejects.toMatchObject({ code: "MEDIA_IMAGE_INVALID" });
    await expect(inspectCalebImageUpload(uploadFile(Buffer.alloc(10 * 1024 * 1024 + 1), "image/png")))
      .rejects.toMatchObject({ code: "MEDIA_TOO_LARGE" });
  });

  it("rejects either dimension over 8192 and decoded area over 40 MP", async () => {
    const oversized = fixture({ inspect: async () => ({ mimeType: "image/jpeg", width: 8193, height: 1 }) });
    await expect(oversized.store.upload({
      file: uploadFile(await image("jpeg"), "image/jpeg"), label: "Hero", alt: "Caleb smiling",
      idempotencyKey: "oversized-dimension", correlationId,
    })).rejects.toMatchObject({ code: "MEDIA_DIMENSIONS_INVALID" });

    const tooManyPixels = fixture({ inspect: async () => ({ mimeType: "image/jpeg", width: 8000, height: 6000 }) });
    await expect(tooManyPixels.store.upload({
      file: uploadFile(await image("jpeg"), "image/jpeg"), label: "Hero", alt: "Caleb smiling",
      idempotencyKey: "oversized-area", correlationId,
    })).rejects.toMatchObject({ code: "MEDIA_DIMENSIONS_INVALID" });
  });

  it("requires useful alt text before uploading", async () => {
    const { store, storage } = fixture();
    await expect(store.upload({
      file: uploadFile(await image("jpeg"), "image/jpeg"), label: "Hero", alt: "   ",
      idempotencyKey: "missing-alt", correlationId,
    })).rejects.toBeInstanceOf(CalebMediaStoreError);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("creates an immutable object key and returns the exact first-party MediaAsset", async () => {
    const { store, storage, queries } = fixture();
    const result = await store.upload({
      file: uploadFile(await image("jpeg"), "image/jpeg"), label: "Homepage hero", alt: "Caleb smiling",
      idempotencyKey: "upload-hero", correlationId,
    });
    expect(storage.upload).toHaveBeenCalledWith(
      `${siteId}/${assetId}.jpg`, expect.any(Uint8Array), "image/jpeg",
    );
    expect(result).toEqual({
      status: "applied",
      asset: {
        id: assetId,
        siteId,
        path: `/api/site-media/${assetId}`,
        url: `/api/site-media/${assetId}`,
        alt: "Caleb smiling",
        label: "Homepage hero",
        mimeType: "image/jpeg",
        source: "upload",
        width: 4,
        height: 3,
        userId: actorId,
        createdAt: now,
      },
    });
    expect(JSON.stringify(result)).not.toContain(`${siteId}/${assetId}.jpg`);
    expect(queries.some((sql) => sql.includes("builder_media_assets"))).toBe(true);
  });

  it("removes the newly uploaded object when metadata persistence fails", async () => {
    const { store, storage } = fixture({ failInsert: true });
    await expect(store.upload({
      file: uploadFile(await image("jpeg"), "image/jpeg"), label: "Hero", alt: "Caleb smiling",
      idempotencyKey: "cleanup", correlationId,
    })).rejects.toThrow("metadata unavailable");
    expect(storage.remove).toHaveBeenCalledWith(`${siteId}/${assetId}.jpg`);
  });

  it("never returns another site's media row", async () => {
    const { store } = fixture();
    await expect(store.delivery("foreign-asset")).resolves.toBeNull();
  });
});
