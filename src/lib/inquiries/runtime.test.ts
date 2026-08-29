import { describe, expect, it } from "vitest";

import {
  createInquiryRuntime,
  trustedClientIpFromRequest,
} from "@/lib/inquiries/runtime";

const completeEnv = {
  DATABASE_URL: "postgresql://runtime:secret@db.example.test/caleb?sslmode=require",
  NATIVE_INQUIRY_SITE_ID: "11111111-1111-4111-8111-111111111111",
  NATIVE_INQUIRY_RUNTIME_MEMBER_ID: "22222222-2222-4222-8222-222222222222",
  NATIVE_INQUIRY_CAPABILITIES_JSON: JSON.stringify([
    "forms.submit",
    "customers.write",
    "leads.write",
    "messaging.enqueue",
  ]),
  RESEND_FROM_EMAIL: "Caleb Jakes <bookings@mail.calebjakes.com>",
  INQUIRY_NOTIFICATION_EMAIL: "info@calebjakes.com",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
  INQUIRY_HMAC_ACTIVE_KEY_ID: "v1",
  INQUIRY_HMAC_SECRET: "hmac-secret-with-sufficient-entropy",
  INQUIRY_HMAC_PREVIOUS_KEYS_JSON: "{}",
};

describe("inquiry production runtime", () => {
  it("fails closed when any required provider configuration is missing", () => {
    expect(createInquiryRuntime({})).toBeNull();
    expect(
      createInquiryRuntime({
        ...completeEnv,
        DATABASE_URL: "",
      }),
    ).toBeNull();
  });

  it("reports the missing configuration key without exposing its value", () => {
    const diagnostics: Array<Record<string, string>> = [];

    expect(
      createInquiryRuntime(
        {
          ...completeEnv,
          DATABASE_URL: "",
        },
        (diagnostic) => diagnostics.push(diagnostic),
      ),
    ).toBeNull();
    expect(diagnostics).toEqual([
      {
        code: "missing_configuration",
        component: "DATABASE_URL",
      },
    ]);
  });

  it("fails closed for an invalid identity keyring or capability list", () => {
    expect(
      createInquiryRuntime({
        ...completeEnv,
        INQUIRY_HMAC_ACTIVE_KEY_ID: "",
      }),
    ).toBeNull();
    expect(
      createInquiryRuntime({
        ...completeEnv,
        NATIVE_INQUIRY_CAPABILITIES_JSON: '{"version":2}',
      }),
    ).toBeNull();
  });

  it("reports the invalid parser stage without logging configuration values", () => {
    const diagnostics: Array<Record<string, string>> = [];

    expect(
      createInquiryRuntime(
        {
          ...completeEnv,
        NATIVE_INQUIRY_CAPABILITIES_JSON: '["forms.submit","unknown.write"]',
        },
        (diagnostic) => diagnostics.push(diagnostic),
      ),
    ).toBeNull();
    expect(diagnostics).toEqual([
      {
        code: "invalid_configuration",
        component: "native_inquiry_session",
      },
    ]);
  });

  it("creates the runtime only from complete native server configuration", () => {
    expect(createInquiryRuntime(completeEnv)).not.toBeNull();
  });

  it("ignores unrelated legacy provider configuration", () => {
    expect(
      createInquiryRuntime({
        ...completeEnv,
        LEGACY_CRM_TOKEN: "must-not-be-used",
        LEGACY_CRM_LOCATION: "must-not-be-used",
      }),
    ).not.toBeNull();
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
