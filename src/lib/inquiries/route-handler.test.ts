import { describe, expect, it, vi } from "vitest";

import { createInquiryPostHandler } from "@/lib/inquiries/route-handler";
import type { NativeInquiryResult } from "@/lib/inquiries/native-service";

const accepted: NativeInquiryResult = {
  status: 202,
  body: {
    code: "accepted",
    message: "received",
    inquiryId: "CJ-ABCDEF123456",
    acceptedAt: "2026-08-18T20:00:00.000Z",
  },
};

describe("inquiry route handler", () => {
  it("rejects unsupported content types", async () => {
    const handler = createInquiryPostHandler({
      resolveRuntime: () => ({ submit: async () => accepted }),
    });
    const response = await handler(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        body: "fullName=Jordan",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      }),
    );

    expect(response.status).toBe(415);
    expect((await response.json()).code).toBe("unsupported_content_type");
  });

  it("rejects bodies larger than 32 KiB", async () => {
    const handler = createInquiryPostHandler({
      resolveRuntime: () => ({ submit: async () => accepted }),
    });
    const response = await handler(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        body: JSON.stringify({ value: "x".repeat(33 * 1024) }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe("payload_too_large");
  });

  it("fails closed when production adapters are unavailable", async () => {
    const handler = createInquiryPostHandler({
      resolveRuntime: () => null,
    });
    const response = await handler(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("service_unavailable");
  });

  it("forwards typed service responses and retry headers", async () => {
    const handler = createInquiryPostHandler({
      resolveRuntime: () => ({
        submit: async () => ({
          status: 429,
          retryAfter: 300,
          body: {
            code: "rate_limited",
            message: "wait",
          },
        }),
      }),
      getTrustedClientIp: () => "203.0.113.7",
    });
    const response = await handler(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("300");
    expect((await response.json()).code).toBe("rate_limited");
  });

  it("schedules one best-effort delivery attempt only after native acceptance", async () => {
    const onAccepted = vi.fn();
    const handler = createInquiryPostHandler({
      resolveRuntime: () => ({ submit: async () => accepted }),
      onAccepted,
    });
    const response = await handler(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(202);
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onAccepted).toHaveBeenCalledWith(accepted);
  });

  it("does not schedule delivery for rejected submissions", async () => {
    const onAccepted = vi.fn();
    const handler = createInquiryPostHandler({
      resolveRuntime: () => ({
        submit: async () => ({
          status: 400,
          body: { code: "validation_failed", message: "correct fields" },
        }),
      }),
      onAccepted,
    });
    await handler(
      new Request("http://localhost/api/inquiries", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(onAccepted).not.toHaveBeenCalled();
  });
});
