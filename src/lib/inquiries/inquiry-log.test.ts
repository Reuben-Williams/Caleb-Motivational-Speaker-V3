import { describe, expect, it, vi } from "vitest";

import { logInquiryEvent } from "@/lib/inquiries/inquiry-log";

describe("privacy-safe inquiry logging", () => {
  it("logs only the approved operational allowlist", () => {
    const sink = vi.fn();

    logInquiryEvent(
      {
        inquiryId: "CJ-ABCDEF123456",
        correlationId: "correlation-a",
        operation: "opportunity_create",
        httpClass: "5xx",
        attempt: 2,
        code: "opportunity_create_unavailable",
        name: "Private Person",
        email: "private@example.invalid",
        phone: "+1 404 555 0100",
        organization: "Private Organization",
        freeText: "private event goals",
        token: "secret-token",
        providerBody: "private response body",
        contactId: "contact-private",
        opportunityId: "opportunity-private",
      } as never,
      sink,
    );

    const output = JSON.stringify(sink.mock.calls);
    expect(output).toContain("CJ-ABCDEF123456");
    expect(output).toContain("opportunity_create_unavailable");
    for (const forbidden of [
      "Private Person",
      "private@example.invalid",
      "+1 404 555 0100",
      "Private Organization",
      "private event goals",
      "secret-token",
      "private response body",
      "contact-private",
      "opportunity-private",
    ]) {
      expect(output).not.toContain(forbidden);
    }
  });
});
