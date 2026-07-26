import { describe, expect, it } from "vitest";

import {
  bookingSchema,
} from "@/lib/booking-schema";
import { validBooking } from "../../tests/booking-fixture";

describe("bookingSchema", () => {
  it("accepts a complete approved inquiry", () => {
    expect(bookingSchema.safeParse(validBooking).success).toBe(true);
  });

  it("requires an audience description when audience type is other", () => {
    const result = bookingSchema.safeParse({
      ...validBooking,
      audienceType: "other",
      audienceTypeOther: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.audienceTypeOther).toContain(
        "Please enter the audience type.",
      );
    }
  });

  it("rejects an end date earlier than the start date", () => {
    const result = bookingSchema.safeParse({
      ...validBooking,
      preferredDateStart: "2099-06-20",
      preferredDateEnd: "2099-06-19",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.preferredDateEnd).toContain(
        "Please choose an end date on or after the start date.",
      );
    }
  });

  it("rejects a preferred start date before the supplied New York date", () => {
    const result = bookingSchema.safeParse(
      {
        ...validBooking,
        preferredDateStart: "2026-07-24",
        preferredDateEnd: "",
      },
      { error: undefined },
    );

    expect(result.success).toBe(false);
  });
});
