import { describe, expect, it } from "vitest";

import { isAuthorizedWorkerRequest } from "@/lib/inquiries/worker-auth";

describe("inquiry worker authorization", () => {
  it("accepts only the exact bearer secret", () => {
    const secret = "worker-secret-with-enough-entropy";
    expect(
      isAuthorizedWorkerRequest(
        new Request("https://example.test", {
          headers: { authorization: `Bearer ${secret}` },
        }),
        secret,
      ),
    ).toBe(true);
    expect(
      isAuthorizedWorkerRequest(
        new Request("https://example.test", {
          headers: { authorization: "Bearer wrong" },
        }),
        secret,
      ),
    ).toBe(false);
  });

  it("fails closed for missing or weak server configuration", () => {
    const request = new Request("https://example.test", {
      headers: { authorization: "Bearer short" },
    });
    expect(isAuthorizedWorkerRequest(request, undefined)).toBe(false);
    expect(isAuthorizedWorkerRequest(request, "short")).toBe(false);
  });
});
