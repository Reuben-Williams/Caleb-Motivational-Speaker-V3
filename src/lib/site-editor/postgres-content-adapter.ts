import "server-only";

import { randomUUID as nodeRandomUUID } from "node:crypto";

import type {
  AuditEvent,
  BuilderContentAdapter,
  EditableValue,
  MediaAsset,
  PageContent,
  PublishInput,
  RollbackInput,
  SaveDraftInput,
  UndoRollbackInput,
  VersionRecord,
  VersionStatus,
} from "@reuben-williams/core";
import type {
  DataPlaneSession,
  DataPlaneTransaction,
} from "@reuben-williams/next/database";

import {
  canonicalContentPayloadDigest,
  ContentCommandStore,
  type CalebContentOperation,
} from "./content-command-store";
import {
  resolveCalebDraftContent,
  resolveCalebPublishedContent,
  validateCalebPageOverrides,
  type CalebStoredPageContent,
} from "./content-resolution";
import { validateCalebEditableValue } from "./content-validation";
import { enqueueContentRevalidation } from "./revalidation-store";
import {
  CALEB_EDITOR_SITE_CONFIG,
  findCalebEditorRegion,
} from "./site-config";

interface Database {
  withSession<Result>(
    session: DataPlaneSession,
    operation: (transaction: DataPlaneTransaction) => Promise<Result>,
  ): Promise<Result>;
}

type PublicOperation = "publish" | "rollback" | "undoRollback";

export type CalebContentStoreErrorCode =
  | "CONTENT_SITE_MISMATCH"
  | "CONTENT_PAGE_UNDECLARED"
  | "CONTENT_REGION_UNDECLARED"
  | "CONTENT_VERSION_CONFLICT"
  | "CONTENT_VERSION_NOT_FOUND"
  | "CONTENT_ROLLBACK_NOT_UNDOABLE"
  | "CONTENT_SNAPSHOT_INVALID"
  | "CONTENT_STORE_INVALID"
  | "CONTENT_MEDIA_NOT_IMPLEMENTED";

export class CalebContentStoreError extends Error {
  readonly httpStatus: number;

  constructor(public readonly code: CalebContentStoreErrorCode) {
    super(code);
    this.name = "CalebContentStoreError";
    this.httpStatus = code === "CONTENT_VERSION_CONFLICT"
      ? 409
      : code === "CONTENT_VERSION_NOT_FOUND"
        ? 404
        : 400;
  }
}

export interface CalebContentState {
  content: PageContent;
  draftVersionId: string | null;
  publishedVersionId: string | null;
}

interface CommandBase {
  pagePath: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface SaveDraftCommandInput extends CommandBase {
  regionId: string;
  value: unknown;
  expectedDraftVersionId: string | null;
}

export interface PublishCommandInput extends CommandBase {
  expectedDraftVersionId: string | null;
  expectedPublishedVersionId: string | null;
}

export interface RollbackCommandInput extends CommandBase {
  versionId: string;
  expectedPublishedVersionId: string | null;
}

export interface UndoRollbackCommandInput extends CommandBase {
  rollbackVersionId: string;
  expectedPublishedVersionId: string | null;
}

export interface CalebContentCommandResult {
  status: "applied" | "replayed";
  version: VersionRecord;
  draftVersionId: string | null;
  publishedVersionId: string | null;
  correlationId: string;
  revalidation?: "pending";
}

interface RawPageState {
  draft: CalebStoredPageContent | null;
  published: CalebStoredPageContent | null;
}

interface StoredVersion {
  id: string;
  parentVersionId: string | null;
  sourceVersionId: string | null;
  status: VersionStatus;
  snapshot: CalebStoredPageContent;
  actorId?: string;
  createdAt?: string;
}

interface AdapterOptions {
  database: Database;
  session: DataPlaneSession;
  now?: () => string;
  randomUUID?: () => string;
  resolveMedia?: (mediaId: string) => { path: string } | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): string {
  const date = value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new CalebContentStoreError("CONTENT_STORE_INVALID");
  }
  return date.toISOString();
}

function regions(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (!isRecord(value)) throw new CalebContentStoreError("CONTENT_STORE_INVALID");
  return structuredClone(value);
}

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !value) {
    throw new CalebContentStoreError("CONTENT_STORE_INVALID");
  }
  return value;
}

function page(path: string): void {
  if (!CALEB_EDITOR_SITE_CONFIG.pages.some((candidate) => candidate.path === path)) {
    throw new CalebContentStoreError("CONTENT_PAGE_UNDECLARED");
  }
}

function assertToken(actual: string | null, expected: string | null): void {
  if (actual !== expected) {
    throw new CalebContentStoreError("CONTENT_VERSION_CONFLICT");
  }
}

function safeSnapshot(path: string, value: unknown): CalebStoredPageContent {
  if (!isRecord(value) || value.path !== path || !isRecord(value.regions)) {
    throw new CalebContentStoreError("CONTENT_SNAPSHOT_INVALID");
  }
  return {
    path,
    regions: structuredClone(value.regions),
    ...(typeof value.updatedAt === "string" ? { updatedAt: value.updatedAt } : {}),
  };
}

function auditAction(operation: CalebContentOperation): string {
  switch (operation) {
    case "saveDraft": return "saveDraft";
    case "publish": return "publish";
    case "rollback": return "rollback";
    case "undoRollback": return "undoRollback";
    default: throw new CalebContentStoreError("CONTENT_STORE_INVALID");
  }
}

export class CalebPostgresContentAdapter implements BuilderContentAdapter {
  private readonly now: () => string;
  private readonly nextId: () => string;

  constructor(private readonly input: AdapterOptions) {
    if (input.session.siteId !== CALEB_EDITOR_SITE_CONFIG.siteId) {
      throw new CalebContentStoreError("CONTENT_SITE_MISMATCH");
    }
    this.now = input.now ?? (() => new Date().toISOString());
    this.nextId = input.randomUUID ?? nodeRandomUUID;
  }

  private assertSite(siteId: string): void {
    if (siteId !== this.input.session.siteId) {
      throw new CalebContentStoreError("CONTENT_SITE_MISMATCH");
    }
  }

  private run<Result>(
    operation: (transaction: DataPlaneTransaction) => Promise<Result>,
  ): Promise<Result> {
    return this.input.database.withSession(this.input.session, async (transaction) => {
      try {
        await transaction.query("set local role builder_content_runtime");
        return await operation(transaction);
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{2,64}$/.test(error.code)
          ? error.code : error instanceof TypeError ? "INVALID_SHAPE" : "UNCLASSIFIED";
        console.warn("website_content_transaction_failed", { code });
        throw error;
      }
    });
  }

  private async rawState(
    transaction: DataPlaneTransaction,
    pagePath: string,
    lock: boolean,
  ): Promise<RawPageState> {
    page(pagePath);
    if (lock) {
      await transaction.query(
        "select pg_advisory_xact_lock(hashtextextended($1::text,1)) as locked",
        [`${this.input.session.siteId}:${pagePath}`],
      );
    }
    const result = await transaction.query<{
      draft_regions: unknown;
      draft_version_id: unknown;
      draft_updated_at: unknown;
      published_regions: unknown;
      published_version_id: unknown;
      published_updated_at: unknown;
    }>(
      `select
        (select region_values from public.builder_draft_pages
          where site_id=$1::uuid and page_path=$2) as draft_regions,
        (select current_version_id from public.builder_draft_pages
          where site_id=$1::uuid and page_path=$2) as draft_version_id,
        (select updated_at from public.builder_draft_pages
          where site_id=$1::uuid and page_path=$2) as draft_updated_at,
        (select region_values from public.builder_published_pages
          where site_id=$1::uuid and page_path=$2) as published_regions,
        (select source_version_id from public.builder_published_pages
          where site_id=$1::uuid and page_path=$2) as published_version_id,
        (select updated_at from public.builder_published_pages
          where site_id=$1::uuid and page_path=$2) as published_updated_at`,
      [this.input.session.siteId, pagePath],
    );
    const row = result.rows[0];
    if (!row) throw new CalebContentStoreError("CONTENT_STORE_INVALID");
    const draftVersionId = nullableText(row.draft_version_id);
    const publishedVersionId = nullableText(row.published_version_id);
    return {
      draft: draftVersionId
        ? {
            path: pagePath,
            regions: regions(row.draft_regions),
            versionId: draftVersionId,
            updatedAt: timestamp(row.draft_updated_at),
          }
        : null,
      published: publishedVersionId
        ? {
            path: pagePath,
            regions: regions(row.published_regions),
            versionId: publishedVersionId,
            updatedAt: timestamp(row.published_updated_at),
          }
        : null,
    };
  }

  private contentState(pagePath: string, raw: RawPageState): CalebContentState {
    return Object.freeze({
      content: resolveCalebDraftContent(pagePath, raw.published, raw.draft, {
        resolveMedia: this.input.resolveMedia,
      }),
      draftVersionId: raw.draft?.versionId ?? null,
      publishedVersionId: raw.published?.versionId ?? null,
    });
  }

  async getContentState(pagePath: string): Promise<CalebContentState> {
    return this.run(async (transaction) =>
      this.contentState(pagePath, await this.rawState(transaction, pagePath, false)));
  }

  async getPublishedContent(siteId: string, pagePath: string): Promise<PageContent> {
    this.assertSite(siteId);
    return this.run(async (transaction) => {
      const state = await this.rawState(transaction, pagePath, false);
      return resolveCalebPublishedContent(pagePath, state.published, {
        resolveMedia: this.input.resolveMedia,
      });
    });
  }

  async getDraftContent(siteId: string, pagePath: string): Promise<PageContent> {
    this.assertSite(siteId);
    return (await this.getContentState(pagePath)).content;
  }

  private async insertVersion(
    transaction: DataPlaneTransaction,
    input: Readonly<{
      id: string;
      pagePath: string;
      status: VersionStatus;
      parentVersionId: string | null;
      sourceVersionId: string | null;
      snapshot: CalebStoredPageContent;
      correlationId: string;
      createdAt: string;
    }>,
  ): Promise<VersionRecord> {
    const result = await transaction.query(
      `insert into public.builder_versions(
        site_id,id,page_path,version_kind,parent_version_id,source_version_id,
        snapshot,actor_id,correlation_id,created_at
      ) values($1::uuid,$2::uuid,$3,$4,$5::uuid,$6::uuid,$7::jsonb,$8::uuid,$9::uuid,$10::timestamptz)`,
      [
        this.input.session.siteId,
        input.id,
        input.pagePath,
        input.status,
        input.parentVersionId,
        input.sourceVersionId,
        JSON.stringify(input.snapshot),
        this.input.session.memberId,
        input.correlationId,
        input.createdAt,
      ],
    );
    if (result.rowCount !== 1) throw new CalebContentStoreError("CONTENT_STORE_INVALID");
    return Object.freeze({
      id: input.id,
      siteId: this.input.session.siteId,
      pagePath: input.pagePath,
      status: input.status,
      snapshot: structuredClone(input.snapshot) as PageContent,
      userId: this.input.session.memberId,
      createdAt: input.createdAt,
    });
  }

  private async writeDraftPointer(
    transaction: DataPlaneTransaction,
    pagePath: string,
    snapshot: CalebStoredPageContent,
    versionId: string,
    updatedAt: string,
  ): Promise<void> {
    const result = await transaction.query(
      `insert into public.builder_draft_pages(
        site_id,page_path,region_values,current_version_id,revision,last_actor_id,updated_at
      ) values($1::uuid,$2,$3::jsonb,$4::uuid,1,$5::uuid,$6::timestamptz)
      on conflict(site_id,page_path) do update set
        region_values=excluded.region_values,current_version_id=excluded.current_version_id,
        revision=builder_draft_pages.revision+1,last_actor_id=excluded.last_actor_id,
        updated_at=excluded.updated_at`,
      [
        this.input.session.siteId,
        pagePath,
        JSON.stringify(snapshot.regions),
        versionId,
        this.input.session.memberId,
        updatedAt,
      ],
    );
    if (result.rowCount !== 1) throw new CalebContentStoreError("CONTENT_STORE_INVALID");
  }

  private async writePublishedPointer(
    transaction: DataPlaneTransaction,
    pagePath: string,
    snapshot: CalebStoredPageContent,
    versionId: string,
    updatedAt: string,
  ): Promise<void> {
    const result = await transaction.query(
      `insert into public.builder_published_pages(
        site_id,page_path,region_values,source_version_id,revision,published_by,
        published_at,updated_at
      ) values($1::uuid,$2,$3::jsonb,$4::uuid,1,$5::uuid,$6::timestamptz,$6::timestamptz)
      on conflict(site_id,page_path) do update set
        region_values=excluded.region_values,source_version_id=excluded.source_version_id,
        revision=builder_published_pages.revision+1,published_by=excluded.published_by,
        published_at=excluded.published_at,updated_at=excluded.updated_at`,
      [
        this.input.session.siteId,
        pagePath,
        JSON.stringify(snapshot.regions),
        versionId,
        this.input.session.memberId,
        updatedAt,
      ],
    );
    if (result.rowCount !== 1) throw new CalebContentStoreError("CONTENT_STORE_INVALID");
  }

  private async writeAudit(
    transaction: DataPlaneTransaction,
    input: Readonly<{
      operation: "saveDraft" | PublicOperation;
      pagePath: string;
      regionId?: string;
      before: unknown;
      after: unknown;
      correlationId: string;
      sourceVersionId: string | null;
      resultVersionId: string;
      createdAt: string;
    }>,
  ): Promise<void> {
    const result = await transaction.query(
      `insert into public.builder_audit_log(
        site_id,action,page_path,region_id,safe_before,safe_after,actor_id,
        correlation_id,source_version_id,result_version_id,created_at
      ) values($1::uuid,$2,$3,$4,$5::jsonb,$6::jsonb,$7::uuid,$8::uuid,$9::uuid,$10::uuid,$11::timestamptz)`,
      [
        this.input.session.siteId,
        auditAction(input.operation),
        input.pagePath,
        input.regionId ?? null,
        JSON.stringify(input.before),
        JSON.stringify(input.after),
        this.input.session.memberId,
        input.correlationId,
        input.sourceVersionId,
        input.resultVersionId,
        input.createdAt,
      ],
    );
    if (result.rowCount !== 1) throw new CalebContentStoreError("CONTENT_STORE_INVALID");
  }

  private replay(value: Readonly<Record<string, unknown>>): CalebContentCommandResult {
    if (
      !isRecord(value.version) ||
      typeof value.version.id !== "string" ||
      typeof value.version.siteId !== "string" ||
      typeof value.version.pagePath !== "string" ||
      !["draft", "published", "rollback", "undoRollback"].includes(String(value.version.status)) ||
      !isRecord(value.version.snapshot) ||
      typeof value.version.userId !== "string" ||
      typeof value.version.createdAt !== "string" ||
      typeof value.correlationId !== "string"
    ) {
      throw new CalebContentStoreError("CONTENT_STORE_INVALID");
    }
    const status = value.version.status as VersionStatus;
    const versionPagePath = value.version.pagePath;
    const version: VersionRecord = {
      id: value.version.id,
      siteId: value.version.siteId,
      pagePath: versionPagePath,
      status,
      snapshot: safeSnapshot(versionPagePath, value.version.snapshot) as PageContent,
      userId: value.version.userId,
      createdAt: timestamp(value.version.createdAt),
    };
    const draftVersionId = nullableText(value.draftVersionId);
    const publishedVersionId = nullableText(value.publishedVersionId);
    return Object.freeze({
      status: "replayed" as const,
      version,
      draftVersionId,
      publishedVersionId,
      correlationId: value.correlationId,
      ...(value.revalidation === "pending" ? { revalidation: "pending" as const } : {}),
    });
  }

  private async command(
    operation: "saveDraft" | PublicOperation,
    payload: Readonly<Record<string, unknown>>,
    input: CommandBase,
    apply: (
      transaction: DataPlaneTransaction,
      state: RawPageState,
      completedAt: string,
    ) => Promise<CalebContentCommandResult>,
  ): Promise<CalebContentCommandResult> {
    const payloadDigest = canonicalContentPayloadDigest(payload);
    return this.run(async (transaction) => {
      const receipts = new ContentCommandStore(transaction);
      const previous = await receipts.lockAndFind({
        siteId: this.input.session.siteId,
        actorId: this.input.session.memberId,
        operation,
        idempotencyKey: input.idempotencyKey,
        payloadDigest,
      });
      if (previous) return this.replay(previous.responseBody);

      const state = await this.rawState(transaction, input.pagePath, true);
      const completedAt = this.now();
      const result = await apply(transaction, state, completedAt);
      await receipts.record({
        siteId: this.input.session.siteId,
        actorId: this.input.session.memberId,
        operation,
        idempotencyKey: input.idempotencyKey,
        payloadDigest,
        responseBody: { ...result },
        httpStatus: 200,
        resultStatus: "applied",
        correlationId: input.correlationId,
        completedAt,
      });
      return result;
    });
  }

  async saveDraftCommand(input: SaveDraftCommandInput): Promise<CalebContentCommandResult> {
    page(input.pagePath);
    const definition = findCalebEditorRegion(input.pagePath, input.regionId);
    if (!definition) throw new CalebContentStoreError("CONTENT_REGION_UNDECLARED");
    const value = validateCalebEditableValue(definition, input.value, {
      phase: "draft",
      resolveMedia: this.input.resolveMedia,
    });
    const payload = {
      action: "saveDraft",
      pagePath: input.pagePath,
      regionId: input.regionId,
      value,
      expectedDraftVersionId: input.expectedDraftVersionId,
    };
    return this.command("saveDraft", payload, input, async (transaction, state, completedAt) => {
      assertToken(state.draft?.versionId ?? null, input.expectedDraftVersionId);
      const currentRegions = regions(state.draft?.regions ?? state.published?.regions ?? {});
      const before = currentRegions[input.regionId] ?? null;
      const nextRegions = validateCalebPageOverrides(
        input.pagePath,
        { ...currentRegions, [input.regionId]: value },
        { phase: "draft", resolveMedia: this.input.resolveMedia },
      );
      const versionId = this.nextId();
      const snapshot: CalebStoredPageContent = {
        path: input.pagePath,
        regions: nextRegions,
        updatedAt: completedAt,
      };
      const version = await this.insertVersion(transaction, {
        id: versionId,
        pagePath: input.pagePath,
        status: "draft",
        parentVersionId: state.draft?.versionId ?? state.published?.versionId ?? null,
        sourceVersionId: null,
        snapshot,
        correlationId: input.correlationId,
        createdAt: completedAt,
      });
      await this.writeDraftPointer(transaction, input.pagePath, snapshot, versionId, completedAt);
      await this.writeAudit(transaction, {
        operation: "saveDraft",
        pagePath: input.pagePath,
        regionId: input.regionId,
        before,
        after: value,
        correlationId: input.correlationId,
        sourceVersionId: state.draft?.versionId ?? null,
        resultVersionId: versionId,
        createdAt: completedAt,
      });
      return Object.freeze({
        status: "applied" as const,
        version,
        draftVersionId: versionId,
        publishedVersionId: state.published?.versionId ?? null,
        correlationId: input.correlationId,
      });
    });
  }

  private async applyPublicSnapshot(
    transaction: DataPlaneTransaction,
    input: Readonly<{
      operation: PublicOperation;
      pagePath: string;
      snapshot: CalebStoredPageContent;
      sourceVersionId: string | null;
      previous: RawPageState;
      versionId: string;
      correlationId: string;
      completedAt: string;
    }>,
  ): Promise<CalebContentCommandResult> {
    const version = await this.insertVersion(transaction, {
      id: input.versionId,
      pagePath: input.pagePath,
      status: input.operation === "publish" ? "published" : input.operation,
      parentVersionId: input.previous.published?.versionId ?? null,
      sourceVersionId: input.sourceVersionId,
      snapshot: input.snapshot,
      correlationId: input.correlationId,
      createdAt: input.completedAt,
    });
    await this.writePublishedPointer(
      transaction,
      input.pagePath,
      input.snapshot,
      input.versionId,
      input.completedAt,
    );
    await this.writeAudit(transaction, {
      operation: input.operation,
      pagePath: input.pagePath,
      before: input.previous.published?.regions ?? null,
      after: input.snapshot.regions,
      correlationId: input.correlationId,
      sourceVersionId: input.sourceVersionId,
      resultVersionId: input.versionId,
      createdAt: input.completedAt,
    });
    await enqueueContentRevalidation(transaction, {
      siteId: this.input.session.siteId,
      pagePath: input.pagePath,
      publishedVersionId: input.versionId,
      operation: input.operation,
      correlationId: input.correlationId,
    });
    return Object.freeze({
      status: "applied" as const,
      version,
      draftVersionId: input.previous.draft?.versionId ?? null,
      publishedVersionId: input.versionId,
      correlationId: input.correlationId,
      revalidation: "pending" as const,
    });
  }

  async publishCommand(input: PublishCommandInput): Promise<CalebContentCommandResult> {
    page(input.pagePath);
    const payload = {
      action: "publish",
      pagePath: input.pagePath,
      expectedDraftVersionId: input.expectedDraftVersionId,
      expectedPublishedVersionId: input.expectedPublishedVersionId,
    };
    return this.command("publish", payload, input, async (transaction, state, completedAt) => {
      assertToken(state.draft?.versionId ?? null, input.expectedDraftVersionId);
      assertToken(state.published?.versionId ?? null, input.expectedPublishedVersionId);
      const validated = validateCalebPageOverrides(
        input.pagePath,
        state.draft?.regions ?? state.published?.regions ?? {},
        { resolveMedia: this.input.resolveMedia },
      );
      const versionId = this.nextId();
      return this.applyPublicSnapshot(transaction, {
        operation: "publish",
        pagePath: input.pagePath,
        snapshot: { path: input.pagePath, regions: validated, updatedAt: completedAt },
        sourceVersionId: state.draft?.versionId ?? null,
        previous: state,
        versionId,
        correlationId: input.correlationId,
        completedAt,
      });
    });
  }

  private async storedVersion(
    transaction: DataPlaneTransaction,
    pagePath: string,
    versionId: string,
    rollbackOnly = false,
  ): Promise<StoredVersion> {
    const result = await transaction.query<{
      id: unknown;
      parent_version_id: unknown;
      source_version_id: unknown;
      version_kind: unknown;
      snapshot: unknown;
      actor_id: unknown;
      created_at: unknown;
    }>(
      `select id,parent_version_id,source_version_id,version_kind,snapshot,actor_id,created_at
       from public.builder_versions
       where site_id=$1::uuid and id=$2::uuid and page_path=$3
         ${rollbackOnly ? "and version_kind='rollback'" : ""}`,
      [this.input.session.siteId, versionId, pagePath],
    );
    const row = result.rows[0];
    if (!row || typeof row.id !== "string") {
      throw new CalebContentStoreError(
        rollbackOnly ? "CONTENT_ROLLBACK_NOT_UNDOABLE" : "CONTENT_VERSION_NOT_FOUND",
      );
    }
    const status = row.version_kind;
    if (!status || !["draft", "published", "rollback", "undoRollback"].includes(String(status))) {
      throw new CalebContentStoreError("CONTENT_STORE_INVALID");
    }
    return {
      id: row.id,
      parentVersionId: nullableText(row.parent_version_id),
      sourceVersionId: nullableText(row.source_version_id),
      status: status as VersionStatus,
      snapshot: safeSnapshot(pagePath, row.snapshot),
      ...(typeof row.actor_id === "string" ? { actorId: row.actor_id } : {}),
      ...(row.created_at ? { createdAt: timestamp(row.created_at) } : {}),
    };
  }

  async rollbackCommand(input: RollbackCommandInput): Promise<CalebContentCommandResult> {
    page(input.pagePath);
    const payload = {
      action: "rollback",
      pagePath: input.pagePath,
      versionId: input.versionId,
      expectedPublishedVersionId: input.expectedPublishedVersionId,
    };
    return this.command("rollback", payload, input, async (transaction, state, completedAt) => {
      assertToken(state.published?.versionId ?? null, input.expectedPublishedVersionId);
      const target = await this.storedVersion(transaction, input.pagePath, input.versionId);
      const validated = validateCalebPageOverrides(input.pagePath, target.snapshot.regions, {
        resolveMedia: this.input.resolveMedia,
      });
      const versionId = this.nextId();
      return this.applyPublicSnapshot(transaction, {
        operation: "rollback",
        pagePath: input.pagePath,
        snapshot: { path: input.pagePath, regions: validated, updatedAt: completedAt },
        sourceVersionId: target.id,
        previous: state,
        versionId,
        correlationId: input.correlationId,
        completedAt,
      });
    });
  }

  async undoRollbackCommand(input: UndoRollbackCommandInput): Promise<CalebContentCommandResult> {
    page(input.pagePath);
    const payload = {
      action: "undoRollback",
      pagePath: input.pagePath,
      rollbackVersionId: input.rollbackVersionId,
      expectedPublishedVersionId: input.expectedPublishedVersionId,
    };
    return this.command("undoRollback", payload, input, async (transaction, state, completedAt) => {
      assertToken(state.published?.versionId ?? null, input.expectedPublishedVersionId);
      const rollback = await this.storedVersion(
        transaction,
        input.pagePath,
        input.rollbackVersionId,
        true,
      );
      if (!rollback.parentVersionId) {
        throw new CalebContentStoreError("CONTENT_ROLLBACK_NOT_UNDOABLE");
      }
      const prior = await this.storedVersion(
        transaction,
        input.pagePath,
        rollback.parentVersionId,
      );
      const validated = validateCalebPageOverrides(input.pagePath, prior.snapshot.regions, {
        resolveMedia: this.input.resolveMedia,
      });
      const versionId = this.nextId();
      return this.applyPublicSnapshot(transaction, {
        operation: "undoRollback",
        pagePath: input.pagePath,
        snapshot: { path: input.pagePath, regions: validated, updatedAt: completedAt },
        sourceVersionId: rollback.id,
        previous: state,
        versionId,
        correlationId: input.correlationId,
        completedAt,
      });
    });
  }

  async saveDraft(input: SaveDraftInput): Promise<VersionRecord> {
    this.assertSite(input.siteId);
    if (input.userId !== this.input.session.memberId) {
      throw new CalebContentStoreError("CONTENT_SITE_MISMATCH");
    }
    const state = await this.getContentState(input.pagePath);
    const correlationId = this.nextId();
    return (await this.saveDraftCommand({
      pagePath: input.pagePath,
      regionId: input.regionId,
      value: input.value,
      expectedDraftVersionId: state.draftVersionId,
      idempotencyKey: this.nextId(),
      correlationId,
    })).version;
  }

  async publishVersion(input: PublishInput): Promise<VersionRecord> {
    this.assertSite(input.siteId);
    if (input.userId !== this.input.session.memberId) {
      throw new CalebContentStoreError("CONTENT_SITE_MISMATCH");
    }
    const state = await this.getContentState(input.pagePath);
    return (await this.publishCommand({
      pagePath: input.pagePath,
      expectedDraftVersionId: state.draftVersionId,
      expectedPublishedVersionId: state.publishedVersionId,
      idempotencyKey: this.nextId(),
      correlationId: this.nextId(),
    })).version;
  }

  async rollbackToVersion(input: RollbackInput): Promise<VersionRecord> {
    this.assertSite(input.siteId);
    if (input.userId !== this.input.session.memberId) {
      throw new CalebContentStoreError("CONTENT_SITE_MISMATCH");
    }
    const state = await this.getContentState(input.pagePath);
    return (await this.rollbackCommand({
      pagePath: input.pagePath,
      versionId: input.versionId,
      expectedPublishedVersionId: state.publishedVersionId,
      idempotencyKey: this.nextId(),
      correlationId: this.nextId(),
    })).version;
  }

  async undoRollback(input: UndoRollbackInput): Promise<VersionRecord> {
    this.assertSite(input.siteId);
    if (input.userId !== this.input.session.memberId) {
      throw new CalebContentStoreError("CONTENT_SITE_MISMATCH");
    }
    const state = await this.getContentState(input.pagePath);
    return (await this.undoRollbackCommand({
      pagePath: input.pagePath,
      rollbackVersionId: input.rollbackVersionId,
      expectedPublishedVersionId: state.publishedVersionId,
      idempotencyKey: this.nextId(),
      correlationId: this.nextId(),
    })).version;
  }

  async listAuditLog(siteId: string, pagePath?: string): Promise<AuditEvent[]> {
    this.assertSite(siteId);
    if (pagePath) page(pagePath);
    return this.run(async (transaction) => {
      const result = await transaction.query<Record<string, unknown>>(
        `select id,page_path,action,region_id,safe_before,safe_after,actor_id,
          correlation_id,source_version_id,result_version_id,created_at
         from public.builder_audit_log
         where site_id=$1::uuid and ($2::text is null or page_path=$2)
         order by created_at desc,id`,
        [this.input.session.siteId, pagePath ?? null],
      );
      return result.rows.map((row) => {
        const action = row.action === "saveDraft"
          ? "draft.saved"
          : row.action === "publish"
            ? "version.published"
            : row.action === "rollback"
              ? "version.rolled_back"
              : row.action === "undoRollback"
                ? "rollback.undone"
                : null;
        if (
          !action ||
          typeof row.id !== "string" ||
          typeof row.page_path !== "string" ||
          typeof row.actor_id !== "string"
        ) {
          throw new CalebContentStoreError("CONTENT_STORE_INVALID");
        }
        return {
          id: row.id,
          siteId: this.input.session.siteId,
          pagePath: row.page_path,
          action,
          userId: row.actor_id,
          createdAt: timestamp(row.created_at),
          summary: action === "draft.saved"
            ? `Saved draft for ${String(row.region_id)}`
            : action === "version.published"
              ? `Published ${row.page_path}`
              : action === "version.rolled_back"
                ? `Restored ${row.page_path}`
                : `Undid restore for ${row.page_path}`,
          ...(typeof row.region_id === "string" ? { regionId: row.region_id } : {}),
          ...(isRecord(row.safe_before) ? { before: row.safe_before as EditableValue } : {}),
          ...(isRecord(row.safe_after) ? { after: row.safe_after as EditableValue } : {}),
          ...(typeof row.correlation_id === "string" ? { correlationId: row.correlation_id } : {}),
          ...(typeof row.source_version_id === "string" ? { sourceVersionId: row.source_version_id } : {}),
          ...(typeof row.result_version_id === "string" ? { resultVersionId: row.result_version_id } : {}),
        } satisfies AuditEvent;
      });
    });
  }

  async listVersions(pagePath: string): Promise<VersionRecord[]> {
    page(pagePath);
    return this.run(async (transaction) => {
      const result = await transaction.query<Record<string, unknown>>(
        `select id,version_kind,snapshot,actor_id,created_at
         from public.builder_versions
         where site_id=$1::uuid and page_path=$2
         order by created_at desc,id`,
        [this.input.session.siteId, pagePath],
      );
      return result.rows.map((row) => {
        if (
          typeof row.id !== "string" ||
          typeof row.actor_id !== "string" ||
          !["draft", "published", "rollback", "undoRollback"].includes(String(row.version_kind))
        ) {
          throw new CalebContentStoreError("CONTENT_STORE_INVALID");
        }
        const snapshot = safeSnapshot(pagePath, row.snapshot);
        return {
          id: row.id,
          siteId: this.input.session.siteId,
          pagePath,
          status: row.version_kind as VersionStatus,
          snapshot: snapshot as PageContent,
          userId: row.actor_id,
          createdAt: timestamp(row.created_at),
        };
      });
    });
  }

  async createMediaAsset(): Promise<MediaAsset> {
    throw new CalebContentStoreError("CONTENT_MEDIA_NOT_IMPLEMENTED");
  }

  async listMediaAssets(): Promise<MediaAsset[]> {
    throw new CalebContentStoreError("CONTENT_MEDIA_NOT_IMPLEMENTED");
  }
}
