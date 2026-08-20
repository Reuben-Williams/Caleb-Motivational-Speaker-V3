import { describe, expect, it, vi } from "vitest";

import {
  createCustomerRuntimeBoundary,
  createPrivateAssetBoundary,
  readCustomerSessionToken,
} from "./customer-access";

describe("customer library access boundaries", () => {
  it("accepts exactly one bounded secure customer-session cookie", () => {
    const token = "s".repeat(64);
    expect(readCustomerSessionToken(`other=1; __Host-builder_customer=${token}`)).toBe(token);
    expect(
      readCustomerSessionToken(
        `__Host-builder_customer=${token}; __Host-builder_customer=${token}`,
      ),
    ).toBeNull();
    expect(readCustomerSessionToken("__Host-builder_customer=short")).toBeNull();
  });

  it("denies private assets before any provider lookup", async () => {
    const handle = vi.fn();
    const route = createPrivateAssetBoundary({ enabled: true, handle });
    const response = await route(
      new Request(
        "https://www.calebjakesspeaks.com/api/commerce/assets/c5010000-0000-4000-8000-000000000003",
      ),
      "c5010000-0000-4000-8000-000000000003",
    );

    expect(response.status).toBe(401);
    expect(handle).not.toHaveBeenCalled();
  });

  it("reports setup unavailable without leaking provider details", async () => {
    const route = createCustomerRuntimeBoundary({ enabled: false, handle: vi.fn() });
    const response = await route(new Request("https://example.com", { method: "POST" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "CUSTOMER_ACCESS_NOT_READY" },
    });
  });
});
