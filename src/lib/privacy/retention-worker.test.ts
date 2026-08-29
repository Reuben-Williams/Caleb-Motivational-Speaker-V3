import { describe, expect, it, vi } from "vitest";

import {
  createRetentionWorker,
  PostgresRetentionRepository,
} from "@/lib/privacy/retention-worker";

const siteId = "11111111-1111-4111-8111-111111111111";

describe("native inquiry retention worker", () => {
  it("sets the dedicated database role and fixed site before running retention", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({
        rows: [{ result: { version: 1, retentionDays: 400, scheduledCount: 2, purgedCount: 1, redactedCount: 3 } }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: null });
    const release = vi.fn();
    const repository = new PostgresRetentionRepository({
      pool: { connect: vi.fn().mockResolvedValue({ query, release }) },
      siteId,
    });

    await expect(repository.run("h".repeat(48))).resolves.toEqual({
      retentionDays: 400,
      scheduledCount: 2,
      purgedCount: 1,
      redactedCount: 3,
    });
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "begin",
      "set local role builder_retention_worker",
      "select set_config('builder.site_id',$1,true)",
      "select builder_private.builder_run_inquiry_retention_v1($1) as result",
      "commit",
    ]);
    expect(query.mock.calls[2]?.[1]).toEqual([siteId]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back and exposes no partial success for an invalid result", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [], rowCount: null })
      .mockResolvedValueOnce({ rows: [{ result: { version: 2 } }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: null });
    const repository = new PostgresRetentionRepository({
      pool: { connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }) },
      siteId,
    });

    await expect(repository.run("h".repeat(48))).rejects.toThrow("retention result");
    expect(query).toHaveBeenLastCalledWith("rollback");
  });

  it("runs the server-selected repository without request parameters", async () => {
    const run = vi.fn().mockResolvedValue({
      retentionDays: 400,
      scheduledCount: 0,
      purgedCount: 0,
      redactedCount: 0,
    });
    const worker = createRetentionWorker({ repository: { run }, hmacSecret: "h".repeat(48) });

    await expect(worker.run()).resolves.toMatchObject({ retentionDays: 400 });
    expect(run).toHaveBeenCalledWith("h".repeat(48));
  });
});
