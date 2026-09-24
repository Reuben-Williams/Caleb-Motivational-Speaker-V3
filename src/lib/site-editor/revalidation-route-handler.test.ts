import { describe, expect, it, vi } from "vitest";

import { createCalebRevalidationRouteHandler } from "./revalidation-route-handler";

const CORRELATION_ID = "11111111-1111-4111-8111-111111111111";

function fixture(status: "pending" | "complete" | "failed" | null = "pending") {
  const revalidation = {
    status: vi.fn().mockResolvedValue(status),
    retryFailedCommand: vi.fn().mockResolvedValue({
      status: "applied",
      revalidation: "pending",
      correlationId: CORRELATION_ID,
    }),
  };
  const grant = { correlationId: "22222222-2222-4222-8222-222222222222" };
  const runtime = {
    authorizeRead: vi.fn().mockResolvedValue({ grant, revalidation }),
    authorizeMutation: vi.fn().mockResolvedValue({
      grant,
      revalidation,
      idempotencyKey: "retry-a",
      replay: false,
    }),
  };
  return {
    revalidation,
    runtime,
    handler: createCalebRevalidationRouteHandler({ resolveRuntime: async () => runtime }),
  };
}

describe("Caleb revalidation route", () => {
  it("returns only the authorized actor's safe refresh state", async () => {
    const current = fixture("complete");
    const response = await current.handler(new Request(
      `https://calebjakes.com/api/builder/revalidation?correlationId=${CORRELATION_ID}`,
    ));
    expect(await response.json()).toEqual({ revalidation: "complete" });
    expect(current.runtime.authorizeRead).toHaveBeenCalledWith(
      expect.any(Request),
      "website.preview.read",
    );
  });

  it("retries only a failed job under the protected retry operation", async () => {
    const current = fixture("failed");
    const body = { action: "retry", correlationId: CORRELATION_ID };
    const response = await current.handler(new Request(
      "https://calebjakes.com/api/builder/revalidation",
      {
        method: "POST",
        headers: {
          origin: "https://calebjakes.com",
          cookie: "builder_csrf=csrf-a",
          "x-csrf-token": "csrf-a",
          "idempotency-key": "retry-a",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    ));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "applied",
      revalidation: "pending",
      correlationId: CORRELATION_ID,
    });
    expect(current.runtime.authorizeMutation).toHaveBeenCalledWith(
      expect.any(Request),
      "website.revalidation.retry",
      body,
    );
    expect(current.revalidation.retryFailedCommand).toHaveBeenCalledWith({
      targetCorrelationId: CORRELATION_ID,
      idempotencyKey: "retry-a",
      commandCorrelationId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns not found without exposing worker details", async () => {
    const missing = fixture(null);
    const response = await missing.handler(new Request(
      `https://calebjakes.com/api/builder/revalidation?correlationId=${CORRELATION_ID}`,
    ));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "not_found" });
  });
});

