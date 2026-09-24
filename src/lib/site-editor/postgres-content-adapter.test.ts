import { describe, expect, it, vi } from "vitest";

import {
  CalebContentStoreError,
  CalebPostgresContentAdapter,
} from "./postgres-content-adapter";
import { canonicalContentPayloadDigest } from "./content-command-store";

const siteId = "ce607bf6-2959-4d7e-b52a-31a8d21b1db2";
const actorId = "4c401b42-444c-4bd4-a120-001bb250f2d9";
const draftVersionId = "56de8f63-a080-4a18-a065-fb0ba86a11cb";
const publishedVersionId = "91c26162-abf7-4653-bb95-32ed238e7a37";
const nextVersionId = "7e76e8f0-bfc4-459f-9722-f5a62690b115";
const rollbackVersionId = "73690110-60d2-4cab-8311-c2c98db1b51a";
const correlationId = "628652df-e333-4dd4-bdda-d5b7c3d2cc89";
const now = "2026-09-24T12:00:00.000Z";

const session = {
  siteId,
  memberId: actorId,
  capabilities: ["website.draft.write", "website.publish"],
};

type QueryResult = Readonly<{ rows: readonly Record<string, unknown>[]; rowCount: number | null }>;

function stateRow(input: Partial<Record<string, unknown>> = {}) {
  return {
    draft_regions: null,
    draft_version_id: null,
    draft_updated_at: null,
    published_regions: null,
    published_version_id: null,
    published_updated_at: null,
    ...input,
  };
}

function scriptedDatabase(handler: (sql: string, values: readonly unknown[]) => QueryResult | Promise<QueryResult>) {
  const query = vi.fn((sql: string, values: readonly unknown[] = []) => handler(sql, values));
  const withSession = vi.fn(async (_session, operation) => operation({ ...session, query }));
  return {
    database: { withSession, health: vi.fn(), close: vi.fn() },
    query,
    withSession,
  };
}

function createAdapter(
  handler: (sql: string, values: readonly unknown[]) => QueryResult | Promise<QueryResult>,
  ids = [nextVersionId],
) {
  const scripted = scriptedDatabase(handler);
  let index = 0;
  return {
    ...scripted,
    adapter: new CalebPostgresContentAdapter({
      database: scripted.database,
      session,
      now: () => now,
      randomUUID: () => ids[index++] ?? "a982393b-5789-4682-b8ac-d206873c9c1c",
    }),
  };
}

function defaultHandler(sql: string): QueryResult {
  if (sql.includes("as draft_regions")) return { rows: [stateRow()], rowCount: 1 };
  return { rows: [], rowCount: 1 };
}

describe("CalebPostgresContentAdapter", () => {
  it("maps an empty store to complete fallback content and separate null tokens", async () => {
    const { adapter, query } = createAdapter(defaultHandler);

    const state = await adapter.getContentState("/");

    expect(state.draftVersionId).toBeNull();
    expect(state.publishedVersionId).toBeNull();
    expect(state.content.regions["home.hero.title.line1"]).toEqual({
      type: "text",
      value: "PAIN HAS",
    });
    expect(query.mock.calls[0]?.[0]).toBe("set local role builder_content_runtime");
  });

  it("atomically saves a validated draft with a new draft token, audit, and receipt", async () => {
    const { adapter, query } = createAdapter(defaultHandler);

    const result = await adapter.saveDraftCommand({
      pagePath: "/",
      regionId: "home.hero.title.line1",
      value: { type: "text", value: "A NEW TITLE" },
      expectedDraftVersionId: null,
      idempotencyKey: "save-home-title-1",
      correlationId,
    });

    expect(result.status).toBe("applied");
    expect(result.draftVersionId).toBe(nextVersionId);
    expect(result.publishedVersionId).toBeNull();
    expect(result.version.snapshot.regions["home.hero.title.line1"]).toEqual({
      type: "text",
      value: "A NEW TITLE",
    });
    expect(query.mock.calls.some(([sql]) => String(sql).includes("insert into public.builder_versions"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("builder_draft_pages"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("builder_audit_log"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("builder_content_command_receipts"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("builder_content_revalidation_jobs"))).toBe(false);
  });

  it("rejects a stale draft token without writing", async () => {
    const { adapter, query } = createAdapter((sql) => {
      if (sql.includes("as draft_regions")) {
        return {
          rows: [stateRow({
            draft_regions: { "home.hero.title.line1": { type: "text", value: "CURRENT" } },
            draft_version_id: draftVersionId,
            draft_updated_at: now,
          })],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(adapter.saveDraftCommand({
      pagePath: "/",
      regionId: "home.hero.title.line1",
      value: { type: "text", value: "STALE WRITE" },
      expectedDraftVersionId: null,
      idempotencyKey: "save-home-title-stale",
      correlationId,
    })).rejects.toMatchObject({ code: "CONTENT_VERSION_CONFLICT", httpStatus: 409 });
    expect(query.mock.calls.some(([sql]) => String(sql).includes("insert into public.builder_versions"))).toBe(false);
  });

  it("publishes the current draft, advances only the public token, and enqueues refresh", async () => {
    const draftRegions = {
      "home.hero.title.line1": { type: "text", value: "READY TO PUBLISH" },
    };
    const { adapter, query } = createAdapter((sql) => {
      if (sql.includes("as draft_regions")) {
        return {
          rows: [stateRow({
            draft_regions: draftRegions,
            draft_version_id: draftVersionId,
            draft_updated_at: now,
            published_regions: { "home.hero.title.line1": { type: "text", value: "OLD" } },
            published_version_id: publishedVersionId,
            published_updated_at: now,
          })],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await adapter.publishCommand({
      pagePath: "/",
      expectedDraftVersionId: draftVersionId,
      expectedPublishedVersionId: publishedVersionId,
      idempotencyKey: "publish-home-1",
      correlationId,
    });

    expect(result).toMatchObject({
      status: "applied",
      draftVersionId,
      publishedVersionId: nextVersionId,
      revalidation: "pending",
      correlationId,
    });
    expect(query.mock.calls.some(([sql]) => String(sql).includes("builder_published_pages"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("builder_content_revalidation_jobs"))).toBe(true);
  });

  it("rejects a stale public token independently of the matching draft token", async () => {
    const { adapter, query } = createAdapter((sql) => {
      if (sql.includes("as draft_regions")) {
        return {
          rows: [stateRow({
            draft_regions: { "home.hero.title.line1": { type: "text", value: "DRAFT" } },
            draft_version_id: draftVersionId,
            draft_updated_at: now,
            published_regions: {},
            published_version_id: publishedVersionId,
            published_updated_at: now,
          })],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(adapter.publishCommand({
      pagePath: "/",
      expectedDraftVersionId: draftVersionId,
      expectedPublishedVersionId: null,
      idempotencyKey: "publish-home-stale",
      correlationId,
    })).rejects.toMatchObject({ code: "CONTENT_VERSION_CONFLICT" });
    expect(query.mock.calls.some(([sql]) => String(sql).includes("insert into public.builder_versions"))).toBe(false);
  });

  it("creates append-only rollback and undo versions instead of rewriting history", async () => {
    const targetVersionId = "0f589cab-c430-49d5-ad3d-47900fbef4fa";
    const priorVersionId = "f1fd1303-fddf-489d-9234-03b244ed4964";
    let stateReads = 0;
    const { adapter, query } = createAdapter((sql, values) => {
      if (sql.includes("as draft_regions")) {
        stateReads += 1;
        return {
          rows: [stateRow({
            published_regions: { "about.hero.title": { type: "text", value: "CURRENT" } },
            published_version_id: stateReads === 1 ? publishedVersionId : rollbackVersionId,
            published_updated_at: now,
          })],
          rowCount: 1,
        };
      }
      if (sql.includes("from public.builder_versions") && sql.includes("source_version_id")) {
        if (sql.includes("version_kind='rollback'")) {
          return {
            rows: [{
              id: rollbackVersionId,
              parent_version_id: priorVersionId,
              source_version_id: targetVersionId,
              version_kind: "rollback",
              snapshot: { path: "/about", regions: { "about.hero.title": { type: "text", value: "OLD" } } },
            }],
            rowCount: 1,
          };
        }
        if (values[1] === priorVersionId) {
          return {
            rows: [{
              id: priorVersionId,
              parent_version_id: null,
              source_version_id: null,
              version_kind: "published",
              snapshot: { path: "/about", regions: { "about.hero.title": { type: "text", value: "CURRENT" } } },
            }],
            rowCount: 1,
          };
        }
        return {
          rows: [{
            id: targetVersionId,
            parent_version_id: null,
            source_version_id: null,
            version_kind: "published",
            snapshot: { path: "/about", regions: { "about.hero.title": { type: "text", value: "RESTORED" } } },
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    }, [rollbackVersionId, "42d8d0e7-5bc2-4564-91b2-2c2dd77c9c4d"]);

    const restored = await adapter.rollbackCommand({
      pagePath: "/about",
      versionId: targetVersionId,
      expectedPublishedVersionId: publishedVersionId,
      idempotencyKey: "rollback-about-1",
      correlationId,
    });
    expect(restored.version.status).toBe("rollback");
    expect(restored.version.snapshot.regions["about.hero.title"]).toEqual({ type: "text", value: "RESTORED" });

    const undone = await adapter.undoRollbackCommand({
      pagePath: "/about",
      rollbackVersionId,
      expectedPublishedVersionId: rollbackVersionId,
      idempotencyKey: "undo-about-1",
      correlationId: "32a4ba28-a622-4b2b-9294-e5d82e1c15df",
    });
    expect(undone.version.status).toBe("undoRollback");
    expect(undone.version.snapshot.regions["about.hero.title"]).toEqual({ type: "text", value: "CURRENT" });
    expect(query.mock.calls.filter(([sql]) => String(sql).includes("insert into public.builder_versions"))).toHaveLength(2);
  });

  it("replays a completed command without executing a second mutation", async () => {
    const responseBody = {
      status: "applied",
      draftVersionId,
      publishedVersionId: null,
      correlationId,
      version: {
        id: draftVersionId,
        siteId,
        pagePath: "/",
        status: "draft",
        snapshot: { path: "/", regions: {} },
        userId: actorId,
        createdAt: now,
      },
    };
    const { adapter, query } = createAdapter((sql) => {
      if (sql.includes("builder_content_command_receipts") && sql.includes("select payload_digest")) {
        return {
          rows: [{
            payload_digest: canonicalContentPayloadDigest({
              action: "saveDraft",
              pagePath: "/",
              regionId: "home.hero.title.line1",
              value: { type: "text", value: "A NEW TITLE" },
              expectedDraftVersionId: null,
            }),
            response_body: responseBody,
            http_status: 200,
            result_status: "applied",
            correlation_id: correlationId,
            created_at: now,
            completed_at: now,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const result = await adapter.saveDraftCommand({
      pagePath: "/",
      regionId: "home.hero.title.line1",
      value: { type: "text", value: "A NEW TITLE" },
      expectedDraftVersionId: null,
      idempotencyKey: "save-home-title-1",
      correlationId,
    });

    expect(result.status).toBe("replayed");
    expect(result.version).toEqual(responseBody.version);
    expect(query.mock.calls.some(([sql]) => String(sql).includes("insert into public.builder_versions"))).toBe(false);
  });

  it("maps append-only versions and audit rows to the published history shapes", async () => {
    const { adapter } = createAdapter((sql) => {
      if (sql.includes("from public.builder_versions") && sql.includes("order by created_at desc")) {
        return {
          rows: [{
            id: publishedVersionId,
            version_kind: "published",
            snapshot: { path: "/", regions: { "home.hero.title.line1": { type: "text", value: "PUBLISHED" } } },
            actor_id: actorId,
            created_at: now,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes("from public.builder_audit_log")) {
        return {
          rows: [{
            id: "9bd1280c-f32e-46af-b141-104499ca8aed",
            page_path: "/",
            action: "publish",
            region_id: null,
            safe_before: {},
            safe_after: { "home.hero.title.line1": { type: "text", value: "PUBLISHED" } },
            actor_id: actorId,
            correlation_id: correlationId,
            source_version_id: draftVersionId,
            result_version_id: publishedVersionId,
            created_at: now,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(adapter.listVersions("/")).resolves.toMatchObject([
      { id: publishedVersionId, status: "published", userId: actorId },
    ]);
    await expect(adapter.listAuditLog(siteId, "/")).resolves.toMatchObject([
      {
        action: "version.published",
        pagePath: "/",
        userId: actorId,
        correlationId,
      },
    ]);
  });

  it("leaves the transaction uncommitted when a later atomic write fails", async () => {
    let committed = false;
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("as draft_regions")) return { rows: [stateRow()], rowCount: 1 };
      if (sql.includes("builder_audit_log")) throw new Error("simulated audit failure");
      return { rows: [], rowCount: 1 };
    });
    const database = {
      withSession: vi.fn(async (_session, operation) => {
        const result = await operation({ ...session, query });
        committed = true;
        return result;
      }),
      health: vi.fn(),
      close: vi.fn(),
    };
    const adapter = new CalebPostgresContentAdapter({
      database,
      session,
      now: () => now,
      randomUUID: () => nextVersionId,
    });

    await expect(adapter.saveDraftCommand({
      pagePath: "/",
      regionId: "home.hero.title.line1",
      value: { type: "text", value: "A NEW TITLE" },
      expectedDraftVersionId: null,
      idempotencyKey: "save-home-title-atomic",
      correlationId,
    })).rejects.toThrow("simulated audit failure");
    expect(committed).toBe(false);
  });

  it("rejects cross-site package calls before accessing the database", async () => {
    const { adapter, withSession } = createAdapter(defaultHandler);
    await expect(
      adapter.getPublishedContent("f531fd46-7c09-408b-8bbd-b87e20c23778", "/"),
    ).rejects.toMatchObject({
      code: "CONTENT_SITE_MISMATCH",
    } satisfies Partial<CalebContentStoreError>);
    expect(withSession).not.toHaveBeenCalled();
  });
});
