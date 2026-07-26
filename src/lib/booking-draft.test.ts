import { beforeEach, describe, expect, it } from "vitest";

import {
  BOOKING_DRAFT_KEY,
  clearBookingDraft,
  readBookingDraft,
  writeBookingDraft,
} from "@/lib/booking-draft";

const now = Date.UTC(2026, 6, 25, 16, 0, 0);
const draftFields = {
  fullName: "Jordan Avery",
  workEmail: "jordan@example.org",
  organization: "North Star College",
  audienceType: "schools-colleges" as const,
  preferredDateStart: "2099-06-20",
  preferredDateEnd: "",
  eventGoals:
    "Help students connect resilience, identity, and purpose with practical next steps.",
};

describe("booking draft storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("writes and restores a versioned draft", () => {
    expect(writeBookingDraft(sessionStorage, draftFields, now)).toBe(true);
    expect(readBookingDraft(sessionStorage, now + 1_000)).toEqual({
      status: "restored",
      fields: draftFields,
    });
  });

  it("removes malformed drafts and reports a restore failure", () => {
    sessionStorage.setItem(BOOKING_DRAFT_KEY, "{not-json");

    expect(readBookingDraft(sessionStorage, now)).toEqual({
      status: "invalid",
      message:
        "We couldn't restore your saved details. Please continue with the form below.",
    });
    expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull();
  });

  it("removes drafts older than 24 hours", () => {
    writeBookingDraft(sessionStorage, draftFields, now);

    expect(readBookingDraft(sessionStorage, now + 86_400_001)).toEqual({
      status: "expired",
      message:
        "Your saved booking draft expired. Please continue with the form below.",
    });
  });

  it("reports unavailable storage without blocking the form", () => {
    const unavailableStorage = {
      getItem() {
        throw new Error("storage disabled");
      },
      setItem() {
        throw new Error("storage disabled");
      },
      removeItem() {
        throw new Error("storage disabled");
      },
    };

    expect(readBookingDraft(unavailableStorage, now)).toEqual({
      status: "unavailable",
      message:
        "Saved details are unavailable in this browser. You can still complete the form below.",
    });
  });

  it("clears an accepted or explicitly discarded draft", () => {
    writeBookingDraft(sessionStorage, draftFields, now);
    clearBookingDraft(sessionStorage);

    expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull();
  });
});
