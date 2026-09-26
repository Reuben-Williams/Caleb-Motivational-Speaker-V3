import { describe, expect, it, vi } from "vitest";

import { createCalebRevalidationWorkerHandler, runCalebRevalidationJobs } from "./revalidation-worker";

const JOB = {
  id: "11111111-1111-4111-8111-111111111111",
  pagePath: "/about-caleb",
  publishedVersionId: "22222222-2222-4222-8222-222222222222",
  operation: "publish" as const,
  attemptCount: 1,
  maxAttempts: 8,
  correlationId: "33333333-3333-4333-8333-333333333333",
  leaseExpiresAt: "2026-09-24T16:01:00.000Z",
};

function authorized() {
  return new Request("https://calebjakes.com/api/builder/workers/revalidation", {
    headers: { authorization: `Bearer ${"s".repeat(32)}` },
  });
}

describe("Caleb revalidation worker", () => {
  it("runs trusted internal work through the same durable claims without a synthetic HTTP request", async () => {
    const store = { claimDue: vi.fn().mockResolvedValue([JOB]), complete: vi.fn().mockResolvedValue(true) };
    const refresh = vi.fn();
    const result = await runCalebRevalidationJobs({ resolveStore: async () => store, refresh,
      workerId: () => "44444444-4444-4444-8444-444444444444" });
    expect(result).toEqual({ claimed: 1, completed: 1, failed: 0 });
    expect(store.claimDue).toHaveBeenCalledWith({ workerId: "44444444-4444-4444-8444-444444444444", limit: 10, leaseSeconds: 120 });
    expect(refresh).toHaveBeenCalledWith(JOB.pagePath, JOB);
  });
  it("claims bounded work, refreshes canonical paths, and completes the lease", async () => {
    const store = {
      claimDue: vi.fn().mockResolvedValue([JOB]),
      complete: vi.fn().mockResolvedValue(true),
    };
    const refresh = vi.fn().mockResolvedValue(undefined);
    const response = await createCalebRevalidationWorkerHandler({
      secret: () => "s".repeat(32),
      resolveStore: async () => store,
      refresh,
      workerId: () => "44444444-4444-4444-8444-444444444444",
    })(authorized());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ claimed: 1, completed: 1, failed: 0 });
    expect(refresh).toHaveBeenCalledWith("/about-caleb", JOB);
    expect(store.claimDue).toHaveBeenCalledWith({
      workerId: "44444444-4444-4444-8444-444444444444",
      limit: 10,
      leaseSeconds: 120,
    });
    expect(store.complete).toHaveBeenCalledWith({
      jobId: JOB.id,
      workerId: "44444444-4444-4444-8444-444444444444",
      succeeded: true,
    });
  });

  it("records a safe failure and leaves crash recovery to the expiring lease", async () => {
    const store = {
      claimDue: vi.fn().mockResolvedValue([JOB]),
      complete: vi.fn().mockResolvedValue(true),
    };
    const response = await createCalebRevalidationWorkerHandler({
      secret: () => "s".repeat(32),
      resolveStore: async () => store,
      refresh: vi.fn().mockRejectedValue(new Error("secret provider detail")),
      workerId: () => "44444444-4444-4444-8444-444444444444",
    })(authorized());
    expect(await response.json()).toEqual({ claimed: 1, completed: 0, failed: 1 });
    expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({
      succeeded: false,
      safeErrorCode: "CONTENT_REFRESH_FAILED",
    }));

    const crashed = {
      claimDue: vi.fn().mockResolvedValue([JOB]),
      complete: vi.fn(),
    };
    await expect(createCalebRevalidationWorkerHandler({
      secret: () => "s".repeat(32),
      resolveStore: async () => crashed,
      refresh: vi.fn().mockImplementation(() => { throw new Error("serverless crash"); }),
      workerId: () => "44444444-4444-4444-8444-444444444444",
      simulateCrashAfterRefreshFailure: true,
    })(authorized())).rejects.toThrow("serverless crash");
    expect(crashed.complete).not.toHaveBeenCalled();
  });

  it("rejects missing secrets and unexpected request parameters", async () => {
    const handler = createCalebRevalidationWorkerHandler({
      secret: () => "s".repeat(32),
      resolveStore: vi.fn(),
      refresh: vi.fn(),
    });
    expect((await handler(new Request(
      "https://calebjakes.com/api/builder/workers/revalidation",
    ))).status).toBe(401);
    expect((await handler(new Request(
      "https://calebjakes.com/api/builder/workers/revalidation?site=other",
      { headers: { authorization: `Bearer ${"s".repeat(32)}` } },
    ))).status).toBe(400);
  });
});
