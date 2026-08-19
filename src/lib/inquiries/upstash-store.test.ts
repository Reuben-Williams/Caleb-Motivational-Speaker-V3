import { describe, expect, it } from "vitest";

import type { InquiryIdentityCandidate } from "@/lib/inquiries/identity";
import {
  ACCEPTED_INQUIRY_TTL_SECONDS,
} from "@/lib/inquiries/identity";
import {
  UpstashInquiryStore,
  type InquiryReservation,
} from "@/lib/inquiries/upstash-store";

type EvalCall = {
  script: string;
  keys: string[];
  args: unknown[];
};

class FakeRedis {
  evalCalls: EvalCall[] = [];
  getValues = new Map<string, unknown>();
  setResult: "OK" | null = "OK";
  evalResult: unknown = 1;

  async eval(script: string, keys: string[], args: unknown[]) {
    this.evalCalls.push({ script, keys, args });
    return this.evalResult;
  }

  async get(key: string) {
    return this.getValues.get(key) ?? null;
  }

  async set() {
    return this.setResult;
  }
}

const active: InquiryIdentityCandidate = {
  keyId: "v2",
  digest: "a".repeat(64),
  ledgerKey: `inquiry:v2:${"a".repeat(64)}`,
  inquiryId: "CJ-AAAAAAAAAAAA",
};
const previous: InquiryIdentityCandidate = {
  keyId: "v1",
  digest: "b".repeat(64),
  ledgerKey: `inquiry:v1:${"b".repeat(64)}`,
  inquiryId: "CJ-BBBBBBBBBBBB",
};

const reservation: InquiryReservation = {
  ledgerKey: active.ledgerKey,
  inquiryId: active.inquiryId,
  keyId: active.keyId,
  ownerToken: "owner-a",
};

function setup() {
  const redis = new FakeRedis();
  const store = new UpstashInquiryStore(redis as never);
  return { redis, store };
}

describe("Upstash inquiry store", () => {
  it("reads every identity candidate and returns a retained previous record", async () => {
    const { redis, store } = setup();
    redis.getValues.set(previous.ledgerKey, {
      state: "accepted",
      inquiryId: "CJ-ORIGINAL0001",
      keyId: "v1",
      contactId: "contact-a",
      opportunityId: "opportunity-a",
      acceptedAt: "2026-08-18T20:00:00.000Z",
    });

    const result = await store.readInquiry([active, previous]);

    expect(result).toMatchObject({
      ledgerKey: previous.ledgerKey,
      record: { state: "accepted", inquiryId: "CJ-ORIGINAL0001" },
    });
  });

  it("reserves the active identity with an owner token and lease expiry", async () => {
    const { redis, store } = setup();

    const result = await store.reserveInquiry(
      active,
      "owner-a",
      new Date("2026-08-18T20:00:00.000Z"),
      900,
    );

    expect(result).toEqual(reservation);
    expect(redis.evalCalls[0]).toMatchObject({
      keys: [active.ledgerKey],
      args: [expect.any(String), 900, "2026-08-18T20:00:00.000Z"],
    });
    expect(JSON.parse(String(redis.evalCalls[0]?.args[0]))).toEqual({
      state: "processing",
      inquiryId: active.inquiryId,
      keyId: "v2",
      ownerToken: "owner-a",
      leaseExpiresAt: "2026-08-18T20:15:00.000Z",
    });
  });

  it("returns null when another owner already holds the inquiry", async () => {
    const { redis, store } = setup();
    redis.evalResult = 0;

    await expect(
      store.reserveInquiry(active, "owner-b", new Date(), 900),
    ).resolves.toBeNull();
  });

  it("owner-checks contact, failure, and acceptance transitions", async () => {
    const { redis, store } = setup();
    const now = new Date("2026-08-18T20:00:00.000Z");

    await store.recordContact(reservation, "contact-a", now);
    await store.recordFailure(reservation, "opportunity_create");
    await store.acceptInquiry(
      reservation,
      "contact-a",
      "opportunity-a",
      now,
    );

    expect(redis.evalCalls.map(({ keys }) => keys)).toEqual([
      [active.ledgerKey],
      [active.ledgerKey],
      [active.ledgerKey],
    ]);
    expect(redis.evalCalls[0]?.args).toContain("owner-a");
    expect(redis.evalCalls[1]?.args).toContain("owner-a");
    expect(redis.evalCalls[2]?.args).toContain("owner-a");
    expect(redis.evalCalls[2]?.args).toContain(ACCEPTED_INQUIRY_TTL_SECONDS);
  });

  it("fails closed when an owner-checked transition loses ownership", async () => {
    const { redis, store } = setup();
    redis.evalResult = 0;

    await expect(
      store.recordContact(reservation, "contact-a", new Date()),
    ).rejects.toThrow("owner");
    await expect(
      store.recordFailure(reservation, "contact_update"),
    ).rejects.toThrow("owner");
    await expect(
      store.acceptInquiry(
        reservation,
        "contact-a",
        "opportunity-a",
        new Date(),
      ),
    ).rejects.toThrow("owner");
  });

  it("acquires, renews, and compare-owner releases the contact lease", async () => {
    const { redis, store } = setup();

    await expect(
      store.acquireContactLease("contact-lease:email-digest", "owner-a", 90),
    ).resolves.toBe(true);
    await expect(
      store.renewContactLease("contact-lease:email-digest", "owner-a", 90),
    ).resolves.toBe(true);
    await expect(
      store.releaseContactLease("contact-lease:email-digest", "owner-a"),
    ).resolves.toBe(true);

    expect(redis.evalCalls[0]?.keys).toEqual(["contact-lease:email-digest"]);
    expect(redis.evalCalls[0]?.args).toEqual(["owner-a", 90]);
    expect(redis.evalCalls[1]?.keys).toEqual(["contact-lease:email-digest"]);
    expect(redis.evalCalls[1]?.args).toEqual(["owner-a"]);
  });
});
