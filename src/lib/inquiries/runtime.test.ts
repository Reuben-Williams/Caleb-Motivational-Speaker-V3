import { describe, expect, it } from "vitest";

import {
  createInquiryRuntime,
  trustedClientIpFromRequest,
} from "@/lib/inquiries/runtime";

const completeEnv = {
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "Caleb Jakes <speaking@example.com>",
  INQUIRY_NOTIFICATION_EMAIL: "booking@example.com",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
  INQUIRY_HMAC_SECRET: "hmac-secret-with-sufficient-entropy",
};

describe("inquiry production runtime", () => {
  it("fails closed when any required provider configuration is missing", () => {
    expect(createInquiryRuntime({})).toBeNull();
    expect(
      createInquiryRuntime({
        ...completeEnv,
        RESEND_API_KEY: "",
      }),
    ).toBeNull();
  });

  it("creates the runtime only from complete server configuration", () => {
    expect(createInquiryRuntime(completeEnv)).not.toBeNull();
  });

  it("reads a client address only from the explicitly trusted header", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "198.51.100.2",
        "cf-connecting-ip": "203.0.113.9",
      },
    });

    expect(trustedClientIpFromRequest(request, undefined)).toBeUndefined();
    expect(
      trustedClientIpFromRequest(request, "cf-connecting-ip"),
    ).toBe("203.0.113.9");
    expect(
      trustedClientIpFromRequest(request, "x-forwarded-for"),
    ).toBe("198.51.100.2");
  });
});
