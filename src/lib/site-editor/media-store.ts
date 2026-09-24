import "server-only";

import { createHash, randomUUID as nodeRandomUUID } from "node:crypto";

import type { MediaAsset } from "@reuben-williams/core";
import type { DataPlaneSession, DataPlaneTransaction } from "@reuben-williams/next/database";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { canonicalContentPayloadDigest, ContentCommandStore } from "./content-command-store";
import { CALEB_MEDIA_SEEDS } from "./media-seed-catalog";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 8192;
const MAX_PIXELS = 40_000_000;
const SEED_USER_ID = "00000000-0000-4000-8000-000000000015";
const SEED_CREATED_AT = "2026-09-24T00:00:00.000Z";

export type CalebMediaStoreErrorCode =
  | "MEDIA_FILE_REQUIRED"
  | "MEDIA_TOO_LARGE"
  | "MEDIA_TYPE_UNSUPPORTED"
  | "MEDIA_MIME_MISMATCH"
  | "MEDIA_IMAGE_INVALID"
  | "MEDIA_DIMENSIONS_INVALID"
  | "MEDIA_LABEL_INVALID"
  | "MEDIA_ALT_INVALID"
  | "MEDIA_STORE_INVALID"
  | "MEDIA_RECEIPT_INVALID";

export class CalebMediaStoreError extends Error {
  readonly httpStatus: number;

  constructor(public readonly code: CalebMediaStoreErrorCode, status = 400) {
    super(code);
    this.name = "CalebMediaStoreError";
    this.httpStatus = status;
  }
}

export interface CalebMediaStorage {
  upload(objectKey: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  remove(objectKey: string): Promise<void>;
  download(objectKey: string): Promise<Uint8Array>;
}

interface Database {
  withSession<Result>(
    session: DataPlaneSession,
    operation: (transaction: DataPlaneTransaction) => Promise<Result>,
  ): Promise<Result>;
}

export interface CalebInspectedImage {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
}

export interface CalebMediaDelivery {
  asset: MediaAsset;
  objectKey: string;
  published: boolean;
  draft: boolean;
}

function cleanText(value: string, code: "MEDIA_LABEL_INVALID" | "MEDIA_ALT_INVALID") {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 240 || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new CalebMediaStoreError(code);
  }
  return normalized;
}

function signature(bytes: Uint8Array): CalebInspectedImage["mimeType"] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) {
    return "image/png";
  }
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function inspectCalebImageUpload(file: File): Promise<CalebInspectedImage> {
  if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function" || file.size < 1) {
    throw new CalebMediaStoreError("MEDIA_FILE_REQUIRED");
  }
  if (file.size > MAX_BYTES) throw new CalebMediaStoreError("MEDIA_TOO_LARGE", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = signature(bytes);
  if (!detected) throw new CalebMediaStoreError("MEDIA_IMAGE_INVALID");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new CalebMediaStoreError("MEDIA_TYPE_UNSUPPORTED");
  }
  if (file.type !== detected) throw new CalebMediaStoreError("MEDIA_MIME_MISMATCH");
  try {
    const metadata = await sharp(bytes, { failOn: "error", limitInputPixels: false }).metadata();
    if (!metadata.width || !metadata.height || metadata.format !== detected.slice(6)) {
      throw new CalebMediaStoreError("MEDIA_IMAGE_INVALID");
    }
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION ||
      metadata.width * metadata.height > MAX_PIXELS) {
      throw new CalebMediaStoreError("MEDIA_DIMENSIONS_INVALID");
    }
    return Object.freeze({ bytes, mimeType: detected, width: metadata.width, height: metadata.height });
  } catch (error) {
    if (error instanceof CalebMediaStoreError) throw error;
    throw new CalebMediaStoreError("MEDIA_IMAGE_INVALID");
  }
}

function extension(mimeType: CalebInspectedImage["mimeType"]) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType.slice(6);
}

function timestamp(value: unknown) {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
  return date.toISOString();
}

function assetFromRow(row: Record<string, unknown>): MediaAsset {
  const id = row.asset_id;
  const siteId = row.site_id;
  const deliveryPath = row.delivery_path;
  if (typeof id !== "string" || typeof siteId !== "string" || typeof deliveryPath !== "string" ||
    typeof row.alt_text !== "string" || typeof row.label !== "string" ||
    typeof row.mime_type !== "string" || typeof row.created_by !== "string" ||
    (row.source !== "seed" && row.source !== "upload")) {
    throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
  }
  const width = Number(row.width);
  const height = Number(row.height);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
  }
  return Object.freeze({
    id, siteId, path: deliveryPath, url: deliveryPath,
    alt: row.alt_text, label: row.label, mimeType: row.mime_type,
    source: row.source, width, height, userId: row.created_by,
    createdAt: timestamp(row.created_at),
  });
}

function assetFromReceipt(value: unknown): MediaAsset {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CalebMediaStoreError("MEDIA_RECEIPT_INVALID", 503);
  }
  const row = value as Record<string, unknown>;
  return assetFromRow({
    asset_id: row.id, site_id: row.siteId, delivery_path: row.path,
    alt_text: row.alt, label: row.label, mime_type: row.mimeType, source: row.source,
    width: row.width, height: row.height, created_by: row.userId, created_at: row.createdAt,
  });
}

export class PostgresMediaStore {
  private readonly inspect: (file: File) => Promise<CalebInspectedImage>;

  constructor(private readonly input: Readonly<{
    database: Database;
    session: DataPlaneSession;
    storage: CalebMediaStorage;
    now?: () => string;
    randomUUID?: () => string;
    inspectImage?: () => Promise<Omit<CalebInspectedImage, "bytes">>;
  }>) {
    this.inspect = input.inspectImage
      ? async (file) => ({ bytes: new Uint8Array(await file.arrayBuffer()), ...await input.inspectImage!() })
      : inspectCalebImageUpload;
  }

  private run<Result>(operation: (transaction: DataPlaneTransaction) => Promise<Result>) {
    return this.input.database.withSession(this.input.session, async (transaction) => {
      await transaction.query("set local role builder_content_runtime");
      return operation(transaction);
    });
  }

  async list(): Promise<readonly MediaAsset[]> {
    const uploaded = await this.run(async (transaction) => {
      const result = await transaction.query<Record<string, unknown>>(
        `select asset_id,site_id,delivery_path,alt_text,label,mime_type,source,
          width,height,created_by,created_at
         from public.builder_media_assets where site_id=$1::uuid
         order by created_at desc,asset_id`,
        [this.input.session.siteId],
      );
      return result.rows.map(assetFromRow);
    });
    const seeds: MediaAsset[] = CALEB_MEDIA_SEEDS.map((seed) => {
      const path = `/api/site-media/${seed.id}`;
      return { ...seed, siteId: this.input.session.siteId, path, url: path, userId: SEED_USER_ID, createdAt: SEED_CREATED_AT };
    });
    return Object.freeze([...uploaded, ...seeds]);
  }

  async upload(input: Readonly<{
    file: File;
    label: string;
    alt: string;
    regionId?: string;
    idempotencyKey: string;
    correlationId: string;
  }>): Promise<Readonly<{ status: "applied" | "replayed"; asset: MediaAsset }>> {
    const label = cleanText(input.label, "MEDIA_LABEL_INVALID");
    const alt = cleanText(input.alt, "MEDIA_ALT_INVALID");
    const inspected = await this.inspect(input.file);
    if (inspected.width > MAX_DIMENSION || inspected.height > MAX_DIMENSION ||
      inspected.width * inspected.height > MAX_PIXELS) {
      throw new CalebMediaStoreError("MEDIA_DIMENSIONS_INVALID");
    }
    const byteDigest = createHash("sha256").update(inspected.bytes).digest("hex");
    const payloadDigest = canonicalContentPayloadDigest({
      label, alt, regionId: input.regionId ?? null, mimeType: inspected.mimeType,
      byteSize: inspected.bytes.byteLength, width: inspected.width, height: inspected.height, byteDigest,
    });
    const randomUUID = this.input.randomUUID ?? nodeRandomUUID;
    const now = this.input.now ?? (() => new Date().toISOString());

    return this.run(async (transaction) => {
      const receipts = new ContentCommandStore(transaction);
      const prior = await receipts.lockAndFind({
        siteId: this.input.session.siteId, actorId: this.input.session.memberId,
        operation: "uploadMedia", idempotencyKey: input.idempotencyKey, payloadDigest,
      });
      if (prior) return Object.freeze({ status: "replayed" as const, asset: assetFromReceipt(prior.responseBody.asset) });

      const id = randomUUID();
      const objectKey = `${this.input.session.siteId}/${id}.${extension(inspected.mimeType)}`;
      const deliveryPath = `/api/site-media/${id}`;
      const createdAt = timestamp(now());
      const asset: MediaAsset = Object.freeze({
        id, siteId: this.input.session.siteId, path: deliveryPath, url: deliveryPath,
        alt, label, mimeType: inspected.mimeType, source: "upload",
        width: inspected.width, height: inspected.height,
        userId: this.input.session.memberId, createdAt,
      });
      await this.input.storage.upload(objectKey, inspected.bytes, inspected.mimeType);
      try {
        const inserted = await transaction.query(
          `insert into public.builder_media_assets(
            site_id,asset_id,object_key,delivery_path,label,alt_text,mime_type,
            byte_size,width,height,source,created_by,created_at
          ) values($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,'upload',$11::uuid,$12::timestamptz)`,
          [this.input.session.siteId, id, objectKey, deliveryPath, label, alt, inspected.mimeType,
            inspected.bytes.byteLength, inspected.width, inspected.height, this.input.session.memberId, createdAt],
        );
        if (inserted.rowCount !== 1) throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
        const audited = await transaction.query(
          `insert into public.builder_audit_log(
            site_id,action,page_path,region_id,safe_after,actor_id,correlation_id,created_at
          ) values($1::uuid,'uploadMedia','/',$2,$3::jsonb,$4::uuid,$5::uuid,$6::timestamptz)`,
          [this.input.session.siteId, input.regionId ?? null,
            JSON.stringify({ mediaId: id, label, alt, mimeType: inspected.mimeType }),
            this.input.session.memberId, input.correlationId, createdAt],
        );
        if (audited.rowCount !== 1) throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
        const responseBody = { status: "applied" as const, asset };
        await receipts.record({
          siteId: this.input.session.siteId, actorId: this.input.session.memberId,
          operation: "uploadMedia", idempotencyKey: input.idempotencyKey, payloadDigest,
          responseBody, httpStatus: 200, resultStatus: "applied",
          correlationId: input.correlationId, completedAt: createdAt,
        });
        return Object.freeze(responseBody);
      } catch (error) {
        await this.input.storage.remove(objectKey).catch(() => undefined);
        throw error;
      }
    });
  }

  async delivery(mediaId: string): Promise<CalebMediaDelivery | null> {
    return this.run(async (transaction) => {
      const result = await transaction.query<Record<string, unknown>>(
        `select media.asset_id,media.site_id,media.object_key,media.delivery_path,
          media.alt_text,media.label,media.mime_type,media.source,media.width,
          media.height,media.created_by,media.created_at,
          exists(select 1 from public.builder_published_pages page,
            lateral jsonb_each(page.region_values) region
            where page.site_id=media.site_id and region.value->>'type'='image'
              and region.value->>'mediaId'=media.asset_id) as published,
          exists(select 1 from public.builder_draft_pages page,
            lateral jsonb_each(page.region_values) region
            where page.site_id=media.site_id and region.value->>'type'='image'
              and region.value->>'mediaId'=media.asset_id) as draft
         from public.builder_media_assets media
         where media.site_id=$1::uuid and media.asset_id=$2`,
        [this.input.session.siteId, mediaId],
      );
      const row = result.rows[0];
      if (!row) return null;
      if (typeof row.object_key !== "string" || typeof row.published !== "boolean" || typeof row.draft !== "boolean") {
        throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
      }
      return Object.freeze({ asset: assetFromRow(row), objectKey: row.object_key, published: row.published, draft: row.draft });
    });
  }

  bytes(objectKey: string) {
    return this.input.storage.download(objectKey);
  }
}

export function createSupabaseMediaStorage(input: Readonly<{ url: string; serviceRoleKey: string; bucket: string }>): CalebMediaStorage {
  const client = createClient(input.url, input.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const bucket = client.storage.from(input.bucket);
  return Object.freeze({
    async upload(objectKey: string, bytes: Uint8Array, mimeType: string) {
      const { error } = await bucket.upload(objectKey, bytes, { contentType: mimeType, cacheControl: "31536000", upsert: false });
      if (error) throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
    },
    async remove(objectKey: string) {
      const { error } = await bucket.remove([objectKey]);
      if (error) throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
    },
    async download(objectKey: string) {
      const { data, error } = await bucket.download(objectKey);
      if (error || !data) throw new CalebMediaStoreError("MEDIA_STORE_INVALID", 503);
      return new Uint8Array(await data.arrayBuffer());
    },
  });
}
