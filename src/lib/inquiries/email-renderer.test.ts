import { describe, expect, it } from "vitest";

import {
  renderBusinessEmail,
  renderConfirmationEmail,
} from "@/lib/inquiries/email-renderer";
import { bookingSchema } from "@/lib/booking-schema";
import { validBooking } from "../../../tests/booking-fixture";

const validData = bookingSchema.parse(validBooking);

describe("inquiry email rendering", () => {
  it("renders the business payload with tracking context but no security token", () => {
    const message = renderBusinessEmail(
      "CJ-ABCDEF123456",
      {
        ...validData,
        turnstileToken: "never-render-this",
        utmSource: "partner",
        referrerPath: "/speaking",
      },
    );

    expect(message.subject).toBe(
      "Speaking inquiry CJ-ABCDEF123456 — North Star College",
    );
    expect(message.text).toContain("UTM source: partner");
    expect(message.text).toContain("Referrer path: /speaking");
    expect(message.text).not.toContain("never-render-this");
  });

  it("keeps private planning details out of the organizer confirmation", () => {
    const message = renderConfirmationEmail(
      "CJ-ABCDEF123456",
      {
        ...validData,
        budgetRange: "10000-plus",
        additionalDetails: "Private organizer detail",
        utmSource: "partner",
      },
    );

    expect(message.subject).toBe(
      "We received your Caleb Jakes speaking inquiry — CJ-ABCDEF123456",
    );
    expect(message.text).toContain("North Star College");
    expect(message.text).toContain("No response time is guaranteed");
    expect(message.text).not.toContain("10000-plus");
    expect(message.text).not.toContain("Private organizer detail");
    expect(message.text).not.toContain("partner");
  });

  it("escapes organizer-supplied content in HTML", () => {
    const message = renderBusinessEmail("CJ-ABCDEF123456", {
      ...validData,
      organization: "<script>alert(1)</script>",
    });

    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});
