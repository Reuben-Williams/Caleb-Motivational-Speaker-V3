import { afterEach, describe, expect, it, vi } from "vitest";

import { bookingSchema } from "@/lib/booking-schema";
import {
  createInquiryIdentityKeyring,
  inquiryIdentityCandidates,
  type InquiryIdentityCandidate,
} from "@/lib/inquiries/identity";
import {
  createInquiryService,
  type InquiryGateway,
  type SpamVerifier,
} from "@/lib/inquiries/service";
import type { InquiryRecord } from "@/lib/inquiries/state";
import type {
  InquiryReservation,
  InquiryStore,
  StoredInquiry,
} from "@/lib/inquiries/upstash-store";
import { validBooking } from "../../../tests/booking-fixture";

const keyring = createInquiryIdentityKeyring({
  activeKeyId: "v2",
  activeSecret: "active-test-secret-with-enough-entropy",
  previousKeysJson: JSON.stringify({
    v1: "previous-test-secret-with-enough-entropy",
  }),
});
const parsedBooking = bookingSchema.parse(validBooking);

class TestStore implements InquiryStore {
  records = new Map<string, InquiryRecord>();
  rateAllowed = true;
  rateRetryAfter = 0;
  leaseResults: boolean[] = [true];
  failContactCheckpoint = false;
  failAcceptanceCheckpoint = false;

  async incrementRateKey() {
    return { allowed: this.rateAllowed, retryAfter: this.rateRetryAfter };
  }

  async readInquiry(
    candidates: readonly InquiryIdentityCandidate[],
  ): Promise<StoredInquiry | null> {
    for (const candidate of candidates) {
      const record = this.records.get(candidate.ledgerKey);
      if (record) return { ledgerKey: candidate.ledgerKey, record };
    }
    return null;
  }

  async reserveInquiry(
    candidate: InquiryIdentityCandidate,
    ownerToken: string,
    now: Date,
    ttlSeconds: number,
  ): Promise<InquiryReservation | null> {
    const current = this.records.get(candidate.ledgerKey);
    if (
      current &&
      (current.state === "processing" ||
        current.state === "contact_resolved") &&
      new Date(current.leaseExpiresAt).getTime() > now.getTime()
    ) {
      return null;
    }
    this.records.set(candidate.ledgerKey, {
      state: "processing",
      inquiryId: current?.inquiryId ?? candidate.inquiryId,
      keyId: current?.keyId ?? candidate.keyId,
      ownerToken,
      leaseExpiresAt: new Date(now.getTime() + ttlSeconds * 1_000).toISOString(),
    });
    return {
      ledgerKey: candidate.ledgerKey,
      inquiryId: current?.inquiryId ?? candidate.inquiryId,
      keyId: current?.keyId ?? candidate.keyId,
      ownerToken,
    };
  }

  async recordContact(
    reservation: InquiryReservation,
    contactId: string,
    now: Date,
  ) {
    if (this.failContactCheckpoint) throw new Error("checkpoint failed");
    this.records.set(reservation.ledgerKey, {
      state: "contact_resolved",
      inquiryId: reservation.inquiryId,
      keyId: reservation.keyId,
      ownerToken: reservation.ownerToken,
      leaseExpiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
      contactId,
    });
  }

  async recordFailure(
    reservation: InquiryReservation,
    operation: string,
  ) {
    const current = this.records.get(reservation.ledgerKey);
    this.records.set(reservation.ledgerKey, {
      state: "business_failed",
      inquiryId: reservation.inquiryId,
      keyId: reservation.keyId,
      contactId:
        current?.state === "contact_resolved" ? current.contactId : undefined,
      failedOperation: operation,
    });
  }

  async acceptInquiry(
    reservation: InquiryReservation,
    contactId: string,
    opportunityId: string,
    acceptedAt: Date,
  ) {
    if (this.failAcceptanceCheckpoint) throw new Error("checkpoint failed");
    this.records.set(reservation.ledgerKey, {
      state: "accepted",
      inquiryId: reservation.inquiryId,
      keyId: reservation.keyId,
      contactId,
      opportunityId,
      acceptedAt: acceptedAt.toISOString(),
    });
  }

  async acquireContactLease() {
    return this.leaseResults.length > 0
      ? (this.leaseResults.shift() ?? false)
      : true;
  }

  async renewContactLease() {
    return true;
  }

  async releaseContactLease() {
    return true;
  }
}

class TestGateway implements InquiryGateway {
  contactCalls = 0;
  opportunityCalls = 0;
  contactFailure: Error | null = null;
  opportunityFailure: Error | null = null;

  async resolveContact() {
    this.contactCalls += 1;
    if (this.contactFailure) throw this.contactFailure;
    return { contactId: "contact-a" };
  }

  async findOrCreateOpportunity() {
    this.opportunityCalls += 1;
    if (this.opportunityFailure) throw this.opportunityFailure;
    return { opportunityId: `opportunity-${this.opportunityCalls}` };
  }
}

const passingSpam: SpamVerifier = { verify: async () => true };

function setup() {
  const store = new TestStore();
  const gateway = new TestGateway();
  const service = createInquiryService({
    identityKeyring: keyring,
    store,
    gateway,
    spam: passingSpam,
    now: () => new Date("2026-08-18T20:00:00.000Z"),
    ownerToken: () => "owner-a",
    sleep: async () => {},
  });
  return { store, gateway, service };
}

describe("inquiry service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts only after contact and opportunity checkpoints complete", async () => {
    const { service, store, gateway } = setup();

    const result = await service.submit(validBooking, {
      trustedClientIp: "203.0.113.10",
    });

    expect(result).toEqual({
      status: 202,
      body: {
        code: "accepted",
        message:
          "Your speaking inquiry was received. Keep the inquiry ID for your records.",
        inquiryId: expect.stringMatching(/^CJ-[A-F0-9]{12}$/),
        acceptedAt: "2026-08-18T20:00:00.000Z",
      },
    });
    expect(result.body).not.toHaveProperty("confirmationEmailSent");
    expect(gateway.contactCalls).toBe(1);
    expect(gateway.opportunityCalls).toBe(1);
    expect([...store.records.values()][0]?.state).toBe("accepted");
  });

  it("returns the original accepted inquiry found under a previous key", async () => {
    const { service, store, gateway } = setup();
    const previous = inquiryIdentityCandidates(parsedBooking, keyring)[1]!;
    store.records.set(previous.ledgerKey, {
      state: "accepted",
      inquiryId: "CJ-ORIGINAL0001",
      keyId: "v1",
      contactId: "contact-a",
      opportunityId: "opportunity-a",
      acceptedAt: "2026-08-17T20:00:00.000Z",
    });

    const result = await service.submit(validBooking, {});

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      code: "duplicate_accepted",
      inquiryId: "CJ-ORIGINAL0001",
      acceptedAt: "2026-08-17T20:00:00.000Z",
    });
    expect(gateway.contactCalls).toBe(0);
    expect(gateway.opportunityCalls).toBe(0);
  });

  it("creates another opportunity when a canonical event field changes", async () => {
    const { service, gateway } = setup();

    const first = await service.submit(validBooking, {});
    const second = await service.submit(
      { ...validBooking, additionalDetails: "A distinct event requirement." },
      {},
    );

    expect(first.body.inquiryId).not.toBe(second.body.inquiryId);
    expect(gateway.contactCalls).toBe(2);
    expect(gateway.opportunityCalls).toBe(2);
  });

  it("reports an identical actively owned inquiry as processing", async () => {
    const { service, store } = setup();
    const active = inquiryIdentityCandidates(parsedBooking, keyring)[0]!;
    store.records.set(active.ledgerKey, {
      state: "processing",
      inquiryId: active.inquiryId,
      keyId: active.keyId,
      ownerToken: "another-owner",
      leaseExpiresAt: "2026-08-18T20:10:00.000Z",
    });

    const result = await service.submit(validBooking, {});

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("inquiry_processing");
  });

  it("records a provider failure and resumes from the contact checkpoint", async () => {
    const { service, store, gateway } = setup();
    gateway.opportunityFailure = new Error("provider unavailable");

    const failed = await service.submit(validBooking, {});
    expect(failed.status).toBe(502);
    expect([...store.records.values()][0]).toMatchObject({
      state: "business_failed",
      contactId: "contact-a",
    });

    gateway.opportunityFailure = null;
    const retry = await service.submit(validBooking, {});

    expect(retry.status).toBe(202);
    expect(gateway.contactCalls).toBe(1);
    expect(gateway.opportunityCalls).toBe(2);
  });

  it("does not create an opportunity when the contact checkpoint fails", async () => {
    const { service, store, gateway } = setup();
    store.failContactCheckpoint = true;

    const result = await service.submit(validBooking, {});

    expect(result.status).toBe(500);
    expect(gateway.contactCalls).toBe(1);
    expect(gateway.opportunityCalls).toBe(0);
  });

  it("stops contact lease acquisition after the five-second budget", async () => {
    const store = new TestStore();
    store.leaseResults = Array.from({ length: 25 }, () => false);
    const gateway = new TestGateway();
    let elapsed = 0;
    const service = createInquiryService({
      identityKeyring: keyring,
      store,
      gateway,
      spam: passingSpam,
      now: () => new Date("2026-08-18T20:00:00.000Z"),
      monotonicNow: () => elapsed,
      ownerToken: () => "owner-a",
      sleep: async (milliseconds) => {
        elapsed += milliseconds;
      },
    });

    const result = await service.submit(validBooking, {});

    expect(result.status).toBe(409);
    expect(elapsed).toBe(5_000);
    expect(gateway.contactCalls).toBe(0);
  });

  it("aborts contact resolution when lease renewal is lost", async () => {
    vi.useFakeTimers();
    const store = new TestStore();
    store.renewContactLease = async () => false;
    const gateway: InquiryGateway = {
      resolveContact: async (_data, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
      findOrCreateOpportunity: async () => ({
        opportunityId: "should-not-run",
      }),
    };
    const service = createInquiryService({
      identityKeyring: keyring,
      store,
      gateway,
      spam: passingSpam,
      ownerToken: () => "owner-a",
    });

    const pending = service.submit(validBooking, {});
    await vi.advanceTimersByTimeAsync(30_000);
    const result = await pending;

    expect(result.status).toBe(502);
    expect([...store.records.values()][0]?.state).toBe("business_failed");
  });

  it("aborts contact resolution at the 75-second maximum budget", async () => {
    vi.useFakeTimers();
    const store = new TestStore();
    const gateway: InquiryGateway = {
      resolveContact: async (_data, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
      findOrCreateOpportunity: async () => ({
        opportunityId: "should-not-run",
      }),
    };
    const service = createInquiryService({
      identityKeyring: keyring,
      store,
      gateway,
      spam: passingSpam,
      ownerToken: () => "owner-a",
    });

    const pending = service.submit(validBooking, {});
    await vi.advanceTimersByTimeAsync(75_000);
    const result = await pending;

    expect(result.status).toBe(502);
    expect([...store.records.values()][0]?.state).toBe("business_failed");
  });

  it("rejects spam and rate-limited requests before provider operations", async () => {
    const { store, gateway } = setup();
    const spamService = createInquiryService({
      identityKeyring: keyring,
      store,
      gateway,
      spam: { verify: async () => false },
    });
    expect((await spamService.submit(validBooking, {})).body.code).toBe(
      "spam_failed",
    );

    const { service, store: limited, gateway: limitedGateway } = setup();
    limited.rateAllowed = false;
    limited.rateRetryAfter = 420;
    const result = await service.submit(validBooking, {});
    expect(result.status).toBe(429);
    expect(result.retryAfter).toBe(420);
    expect(limitedGateway.contactCalls).toBe(0);
  });
});
