import { describe, expect, it, vi } from "vitest";

import {
  PostgresRevalidationStore,
  enqueueContentRevalidation,
} from "./revalidation-store";
import { canonicalContentPayloadDigest } from "./content-command-store";

const session = {
  siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
  memberId: "4c401b42-444c-4bd4-a120-001bb250f2d9",
  capabilities: ["website.publish"],
};

function database(query: ReturnType<typeof vi.fn>) {
  return {
    withSession: vi.fn(async (_session, operation) => operation({ ...session, query })),
    health: vi.fn(),
    close: vi.fn(),
  };
}

describe("Postgres content revalidation store", () => {
  it("enqueues the affected path in the caller's public-pointer transaction", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    await enqueueContentRevalidation({ ...session, query }, {
      siteId: session.siteId,
      pagePath: "/about",
      publishedVersionId: "a6944b8a-dbe2-4de6-9f2f-74d21dc939f5",
      operation: "publish",
      correlationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain("builder_content_revalidation_jobs");
    expect(query.mock.calls[0]?.[1]).toEqual([
      session.siteId,
      "/about",
      "a6944b8a-dbe2-4de6-9f2f-74d21dc939f5",
      "publish",
      "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
    ]);
  });

  it.each([
    ["pending", "pending"],
    ["processing", "pending"],
    ["completed", "complete"],
    ["failed", "failed"],
  ] as const)("maps %s to the safe %s status", async (stored, expected) => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ status: stored }], rowCount: 1 });
    const store = new PostgresRevalidationStore({
      database: database(query),
      session,
    });

    await expect(store.status("628652df-e333-4dd4-bdda-d5b7c3d2cc89")).resolves.toBe(expected);
    expect(query.mock.calls[0]?.[0]).toBe("set local role builder_content_runtime");
    expect(query.mock.calls[1]?.[0]).toContain("receipt.actor_id=$2::uuid");
  });

  it("claims due work with an expiring lease through the reviewed worker function", async () => {
    const claimed = [{
      id: "93fc7a7d-d271-4558-9324-27699e698776",
      pagePath: "/",
      publishedVersionId: "a6944b8a-dbe2-4de6-9f2f-74d21dc939f5",
      operation: "publish",
      attemptCount: 2,
      maxAttempts: 8,
      correlationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
      leaseExpiresAt: "2026-09-24T12:02:00.000Z",
    }];
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ jobs: claimed }], rowCount: 1 });
    const store = new PostgresRevalidationStore({ database: database(query), session });

    await expect(store.claimDue({
      workerId: "8f84496e-cce7-4278-9051-79b9949ac7d2",
      limit: 5,
      leaseSeconds: 120,
    })).resolves.toEqual(claimed);
    expect(query.mock.calls[0]?.[0]).toBe("set local role builder_revalidation_worker");
    expect(query.mock.calls[1]?.[0]).toContain("builder_claim_content_revalidation_jobs_v1");
  });

  it("completes only a currently leased job owned by this worker", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ applied: true }], rowCount: 1 });
    const store = new PostgresRevalidationStore({ database: database(query), session });

    await expect(store.complete({
      jobId: "93fc7a7d-d271-4558-9324-27699e698776",
      workerId: "8f84496e-cce7-4278-9051-79b9949ac7d2",
      succeeded: false,
      safeErrorCode: "ROUTE_REFRESH_FAILED",
    })).resolves.toBe(true);
    expect(query.mock.calls[1]?.[1]).toEqual([
      session.siteId,
      "93fc7a7d-d271-4558-9324-27699e698776",
      "8f84496e-cce7-4278-9051-79b9949ac7d2",
      false,
      "ROUTE_REFRESH_FAILED",
    ]);
  });

  it("moves only a failed job back to pending without advancing content", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ applied: true }], rowCount: 1 });
    const store = new PostgresRevalidationStore({ database: database(query), session });

    await expect(
      store.retryFailed("628652df-e333-4dd4-bdda-d5b7c3d2cc89"),
    ).resolves.toBe(true);
    expect(query.mock.calls[1]?.[0]).toContain("builder_retry_content_revalidation_job_v1");
  });

  it("records retry audit and an immutable command receipt in the same transaction", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ locked: true }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ page_path: "/about", status: "failed" }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const store = new PostgresRevalidationStore({ database: database(query), session });

    await expect(store.retryFailedCommand({
      targetCorrelationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
      idempotencyKey: "retry-a",
      commandCorrelationId: "93fc7a7d-d271-4558-9324-27699e698776",
    })).resolves.toEqual({
      status: "applied",
      revalidation: "pending",
      correlationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
    });
    expect(query.mock.calls[3]?.[0]).toContain("receipt.actor_id=$2::uuid");
    expect(query.mock.calls[4]?.[0]).toContain("status='pending'");
    expect(query.mock.calls[5]?.[0]).toContain("'retryRevalidation'");
    expect(query.mock.calls[6]?.[0]).toContain("builder_content_command_receipts");
  });

  it("replays the durable pending result without updating the job twice", async () => {
    const digest = canonicalContentPayloadDigest({
      action: "retry",
      correlationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
    });
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ locked: true }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{
          payload_digest: digest,
          response_body: {
            status: "applied",
            revalidation: "pending",
            correlationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
          },
          http_status: 200,
          result_status: "applied",
          correlation_id: "93fc7a7d-d271-4558-9324-27699e698776",
          created_at: "2026-09-24T16:00:00.000Z",
          completed_at: "2026-09-24T16:00:00.000Z",
        }],
        rowCount: 1,
      });
    const store = new PostgresRevalidationStore({ database: database(query), session });

    await expect(store.retryFailedCommand({
      targetCorrelationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
      idempotencyKey: "retry-a",
      commandCorrelationId: "93fc7a7d-d271-4558-9324-27699e698776",
    })).resolves.toEqual({
      status: "replayed",
      revalidation: "pending",
      correlationId: "628652df-e333-4dd4-bdda-d5b7c3d2cc89",
    });
    expect(query).toHaveBeenCalledTimes(3);
  });
});
