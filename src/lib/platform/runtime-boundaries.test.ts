import { describe, expect, it, vi } from "vitest";

import { createCheckoutRoute } from "./checkout-route";
import { createProviderWebhookBoundary, createWorkerBoundary } from "./runtime-boundaries";
import { createCheckoutStatusRoute } from "./status-route";

const baseEnvironment = {
  mode: "platform_test" as const,
  siteOrigin: "https://www.calebjakesspeaks.com",
  legacyStoreUrl: "https://joyfound.calebjakes.com/",
  providersReady: false,
  runtimeEnabled: false,
  missing: ["DATABASE_URL"],
  testAccessToken: "a".repeat(32),
};

describe("Caleb runtime route boundaries", () => {
  it("rejects any checkout field other than the server offer key", async () => {
    const route = createCheckoutRoute({
      environment: baseEnvironment,
      createSession: vi.fn(),
    });
    const response = await route(
      new Request("https://www.calebjakesspeaks.com/api/commerce/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-platform-test-token": "a".repeat(32),
        },
        body: JSON.stringify({
          offerStableKey: "caleb-print-book-single",
          amount: 1,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "BROWSER_FIELDS_REJECTED" },
    });
  });

  it("does not call a checkout provider while the approved catalog is empty", async () => {
    const createSession = vi.fn();
    const route = createCheckoutRoute({ environment: baseEnvironment, createSession });
    const response = await route(
      new Request("https://www.calebjakesspeaks.com/api/commerce/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-platform-test-token": "a".repeat(32),
        },
        body: JSON.stringify({ offerStableKey: "caleb-print-book-single" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("requires worker authorization before reporting setup state", async () => {
    const route = createWorkerBoundary({
      secret: "w".repeat(32),
      enabled: false,
      handle: vi.fn(),
    });
    const unauthorized = await route(
      new Request("https://www.calebjakesspeaks.com/api/commerce/workers/automations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    const unavailable = await route(
      new Request("https://www.calebjakesspeaks.com/api/commerce/workers/automations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${"w".repeat(32)}`,
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );

    expect(unauthorized.status).toBe(401);
    expect(unavailable.status).toBe(503);
  });

  it("passes a webhook request untouched only when the runtime is enabled", async () => {
    const handle = vi.fn(async (request: Request) => {
      const body = await request.text();
      return Response.json({ body });
    });
    const disabled = createProviderWebhookBoundary({ enabled: false, handle });
    const enabled = createProviderWebhookBoundary({ enabled: true, handle });

    expect(
      (
        await disabled(
          new Request("https://example.com/webhook", { method: "POST", body: "raw-body" }),
        )
      ).status,
    ).toBe(503);
    const accepted = await enabled(
      new Request("https://example.com/webhook", { method: "POST", body: "raw-body" }),
    );
    await expect(accepted.json()).resolves.toEqual({ body: "raw-body" });
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it("projects checkout state only from a server lookup", async () => {
    const lookup = vi.fn(async () => ({
      serverState: "fulfilled" as const,
      orderId: "7e9e6f4e-37f0-45ca-bef7-8e84a6ab7d31",
    }));
    const route = createCheckoutStatusRoute({ enabled: true, lookup });
    const response = await route(
      new Request(
        "https://www.calebjakesspeaks.com/api/commerce/orders/status?checkout_session_id=cs_test_verified&status=paid&entitlement=active",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      state: "fulfilled",
      orderId: "7e9e6f4e-37f0-45ca-bef7-8e84a6ab7d31",
      grantsAccess: true,
    });
    expect(lookup).toHaveBeenCalledWith("cs_test_verified");
  });
});
