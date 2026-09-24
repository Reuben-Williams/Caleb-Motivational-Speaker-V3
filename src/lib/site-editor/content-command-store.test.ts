import { describe, expect, it, vi } from "vitest";

import {
  CalebContentCommandError,
  ContentCommandStore,
  canonicalContentPayloadDigest,
} from "./content-command-store";

const identity = {
  siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
  actorId: "4c401b42-444c-4bd4-a120-001bb250f2d9",
  operation: "publish" as const,
  idempotencyKey: "publish-home-1",
};

describe("content command receipts", () => {
  it("generates one stable digest independent of object key order", () => {
    expect(canonicalContentPayloadDigest({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalContentPayloadDigest({ a: { c: 3, d: 4 }, b: 2 }),
    );
    expect(canonicalContentPayloadDigest({ b: 2, a: 1 })).toMatch(/^[a-f0-9]{64}$/);
  });

  it("locks the command identity and replays the exact durable result", async () => {
    const responseBody = {
      status: "applied",
      revalidation: "pending",
      correlationId: "f2f07891-1d15-42de-831e-04523333ff8a",
    };
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ locked: true }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{
          payload_digest: canonicalContentPayloadDigest({ pagePath: "/" }),
          response_body: responseBody,
          http_status: 200,
          result_status: "applied",
          correlation_id: responseBody.correlationId,
          created_at: "2026-09-24T12:00:00.000Z",
          completed_at: "2026-09-24T12:00:01.000Z",
        }],
        rowCount: 1,
      });
    const store = new ContentCommandStore({ query });

    const replay = await store.lockAndFind({
      ...identity,
      payloadDigest: canonicalContentPayloadDigest({ pagePath: "/" }),
    });

    expect(replay).toEqual({
      responseBody,
      httpStatus: 200,
      resultStatus: "applied",
      correlationId: responseBody.correlationId,
      createdAt: "2026-09-24T12:00:00.000Z",
      completedAt: "2026-09-24T12:00:01.000Z",
    });
    expect(query.mock.calls[0]?.[0]).toContain("pg_advisory_xact_lock");
    expect(query.mock.calls[1]?.[0]).toContain("builder_content_command_receipts");
  });

  it("fails closed when a key is reused for a different payload", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ locked: true }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{
          payload_digest: canonicalContentPayloadDigest({ pagePath: "/about" }),
          response_body: { status: "applied" },
          http_status: 200,
          result_status: "applied",
          correlation_id: "f2f07891-1d15-42de-831e-04523333ff8a",
          created_at: "2026-09-24T12:00:00.000Z",
          completed_at: "2026-09-24T12:00:01.000Z",
        }],
        rowCount: 1,
      });
    const store = new ContentCommandStore({ query });

    await expect(store.lockAndFind({
      ...identity,
      payloadDigest: canonicalContentPayloadDigest({ pagePath: "/" }),
    })).rejects.toMatchObject({
      code: "CONTENT_IDEMPOTENCY_MISMATCH",
    } satisfies Partial<CalebContentCommandError>);
  });

  it("records an immutable safe response after the mutation completes", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const store = new ContentCommandStore({ query });
    const receipt = {
      ...identity,
      payloadDigest: canonicalContentPayloadDigest({ pagePath: "/" }),
      responseBody: { status: "applied", draftVersionId: "v1" },
      httpStatus: 200,
      resultStatus: "applied" as const,
      correlationId: "f2f07891-1d15-42de-831e-04523333ff8a",
      completedAt: "2026-09-24T12:00:01.000Z",
    };

    await store.record(receipt);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain("insert into public.builder_content_command_receipts");
    expect(query.mock.calls[0]?.[1]).toEqual([
      receipt.siteId,
      receipt.actorId,
      receipt.operation,
      receipt.idempotencyKey,
      receipt.payloadDigest,
      JSON.stringify(receipt.responseBody),
      200,
      "applied",
      receipt.correlationId,
      receipt.completedAt,
    ]);
  });
});
