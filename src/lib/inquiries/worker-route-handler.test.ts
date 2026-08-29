import { describe, expect, it, vi } from "vitest";

import { createInquiryWorkerHandler } from "@/lib/inquiries/worker-route-handler";

const secret = "worker-secret-with-enough-entropy";

function request(method: "GET" | "POST", suffix = "") {
  return new Request(`https://example.test/api/worker${suffix}`, {
    method,
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("inquiry worker route handler", () => {
  it("rejects unauthorized calls before resolving the worker", async () => {
    const resolveWorker = vi.fn();
    const handler = createInquiryWorkerHandler({
      method: "POST",
      secret: () => secret,
      resolveWorker,
    });

    const response = await handler(
      new Request("https://example.test/api/worker", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(resolveWorker).not.toHaveBeenCalled();
  });

  it("rejects query parameters and request bodies", async () => {
    const resolveWorker = vi.fn();
    const handler = createInquiryWorkerHandler({
      method: "POST",
      secret: () => secret,
      resolveWorker,
    });

    expect((await handler(request("POST", "?outboxId=chosen"))).status).toBe(400);
    expect(
      (
        await handler(
          new Request("https://example.test/api/worker", {
            method: "POST",
            headers: {
              authorization: `Bearer ${secret}`,
              "content-type": "application/json",
            },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(400);
    expect(resolveWorker).not.toHaveBeenCalled();
  });

  it("runs the server-selected batch and returns only safe counts", async () => {
    const run = vi.fn().mockResolvedValue({
      claimed: 2,
      delivered: 2,
      failedRetryable: 0,
      deadLetter: 0,
      reconciliationRequired: 0,
    });
    const handler = createInquiryWorkerHandler({
      method: "GET",
      secret: () => secret,
      resolveWorker: () => ({ run }),
    });

    const response = await handler(request("GET"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      code: "worker_complete",
      claimed: 2,
      delivered: 2,
      failedRetryable: 0,
      deadLetter: 0,
      reconciliationRequired: 0,
    });
  });

  it("fails closed when the worker runtime is not configured", async () => {
    const handler = createInquiryWorkerHandler({
      method: "GET",
      secret: () => secret,
      resolveWorker: () => null,
    });
    expect((await handler(request("GET"))).status).toBe(503);
  });
});
