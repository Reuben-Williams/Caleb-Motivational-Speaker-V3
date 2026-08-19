import { describe, expect, it } from "vitest";

import {
  CONTACT_LEASE_ACQUIRE_BUDGET_MS,
  CONTACT_LEASE_RENEW_INTERVAL_MS,
  CONTACT_LEASE_TTL_SECONDS,
  CONTACT_RESOLUTION_BUDGET_MS,
  createLeaseOwnerToken,
  parseInquiryRecord,
  type InquiryRecord,
} from "@/lib/inquiries/state";

describe("durable inquiry state", () => {
  it("parses each approved state with its required fields", () => {
    const records: InquiryRecord[] = [
      {
        state: "processing",
        inquiryId: "CJ-ABCDEF123456",
        keyId: "v1",
        ownerToken: "owner-a",
        leaseExpiresAt: "2026-08-18T20:00:00.000Z",
      },
      {
        state: "contact_resolved",
        inquiryId: "CJ-ABCDEF123456",
        keyId: "v1",
        ownerToken: "owner-a",
        leaseExpiresAt: "2026-08-18T20:00:00.000Z",
        contactId: "contact-a",
      },
      {
        state: "business_failed",
        inquiryId: "CJ-ABCDEF123456",
        keyId: "v1",
        contactId: "contact-a",
        failedOperation: "opportunity_create",
      },
      {
        state: "accepted",
        inquiryId: "CJ-ABCDEF123456",
        keyId: "v1",
        contactId: "contact-a",
        opportunityId: "opportunity-a",
        acceptedAt: "2026-08-18T20:00:00.000Z",
      },
    ];

    expect(records.map(parseInquiryRecord)).toEqual(records);
  });

  it.each([
    { state: "processing", inquiryId: "CJ-A", keyId: "v1" },
    {
      state: "contact_resolved",
      inquiryId: "CJ-A",
      keyId: "v1",
      ownerToken: "owner-a",
      leaseExpiresAt: "2026-08-18T20:00:00.000Z",
    },
    {
      state: "accepted",
      inquiryId: "CJ-A",
      keyId: "v1",
      contactId: "contact-a",
    },
    { state: "unknown", inquiryId: "CJ-A", keyId: "v1" },
  ])("rejects an incomplete or unknown record %#", (record) => {
    expect(() => parseInquiryRecord(record)).toThrow();
  });

  it("pins the approved contact lease timing contract", () => {
    expect(CONTACT_LEASE_ACQUIRE_BUDGET_MS).toBe(5_000);
    expect(CONTACT_LEASE_TTL_SECONDS).toBe(90);
    expect(CONTACT_LEASE_RENEW_INTERVAL_MS).toBe(30_000);
    expect(CONTACT_RESOLUTION_BUDGET_MS).toBe(75_000);
  });

  it("creates unpredictable owner tokens", () => {
    const first = createLeaseOwnerToken();
    const second = createLeaseOwnerToken();

    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second).not.toBe(first);
  });
});
