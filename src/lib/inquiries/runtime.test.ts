import { describe, expect, it } from "vitest";

import {
  createInquiryRuntime,
  trustedClientIpFromRequest,
} from "@/lib/inquiries/runtime";
import manifestFixture from "@/lib/inquiries/__fixtures__/highlevel/field-manifest.json";

const completeEnv = {
  HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN: "highlevel-token",
  HIGHLEVEL_LOCATION_ID: "location-a",
  HIGHLEVEL_PIPELINE_ID: "pipeline-a",
  HIGHLEVEL_NEW_INQUIRY_STAGE_ID: "stage-a",
  HIGHLEVEL_FIELD_MAP_JSON: JSON.stringify(manifestFixture),
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
        HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN: "",
      }),
    ).toBeNull();
  });

  it("reports the missing configuration key without exposing its value", () => {
    const diagnostics: Array<Record<string, string>> = [];

    expect(
      createInquiryRuntime(
        {
          ...completeEnv,
          HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN: "",
        },
        (diagnostic) => diagnostics.push(diagnostic),
      ),
    ).toBeNull();
    expect(diagnostics).toEqual([
      {
        code: "missing_configuration",
        component: "HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN",
      },
    ]);
  });

  it("fails closed for an invalid identity keyring or field manifest", () => {
    expect(
      createInquiryRuntime({
        ...completeEnv,
        INQUIRY_HMAC_ACTIVE_KEY_ID: "",
      }),
    ).toBeNull();
    expect(
      createInquiryRuntime({
        ...completeEnv,
        HIGHLEVEL_FIELD_MAP_JSON: '{"version":2}',
      }),
    ).toBeNull();
  });

  it("reports the invalid parser stage without logging configuration values", () => {
    const diagnostics: Array<Record<string, string>> = [];

    expect(
      createInquiryRuntime(
        {
          ...completeEnv,
          HIGHLEVEL_FIELD_MAP_JSON: '{"version":2}',
        },
        (diagnostic) => diagnostics.push(diagnostic),
      ),
    ).toBeNull();
    expect(diagnostics).toEqual([
      {
        code: "invalid_configuration",
        component: "highlevel_field_manifest",
      },
    ]);
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
