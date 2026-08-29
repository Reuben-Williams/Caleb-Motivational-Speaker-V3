import { describe, expect, it } from "vitest";

import { createInquiryOutboxRuntime } from "@/lib/inquiries/outbox-runtime";

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
  RESEND_API_KEY: "re_test_key",
  RESEND_FROM_EMAIL: "Caleb Jakes <bookings@mail.calebjakes.com>",
  INQUIRY_NOTIFICATION_EMAIL: "info@calebjakes.com",
};

describe("native inquiry outbox runtime", () => {
  it("fails closed and emits only the missing key name", () => {
    const diagnostics: Array<Record<string, string>> = [];
    expect(
      createInquiryOutboxRuntime(
        { ...completeEnv, RESEND_API_KEY: "" },
        (diagnostic) => diagnostics.push(diagnostic),
      ),
    ).toBeNull();
    expect(diagnostics).toEqual([
      { code: "missing_configuration", component: "RESEND_API_KEY" },
    ]);
  });

  it("constructs the fixed server-selected worker without a legacy CRM", () => {
    expect(
      createInquiryOutboxRuntime({
        ...completeEnv,
        LEGACY_CRM_TOKEN: "must-not-be-used",
      }),
    ).not.toBeNull();
  });

  it("rejects an invalid native session", () => {
    const diagnostics: Array<Record<string, string>> = [];
    expect(
      createInquiryOutboxRuntime(
        { ...completeEnv, NATIVE_INQUIRY_SITE_ID: "not-a-uuid" },
        (diagnostic) => diagnostics.push(diagnostic),
      ),
    ).toBeNull();
    expect(diagnostics).toEqual([
      { code: "invalid_configuration", component: "native_inquiry_session" },
    ]);
  });
});
