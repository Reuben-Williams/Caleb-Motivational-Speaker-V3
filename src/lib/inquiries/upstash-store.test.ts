import { describe, expect, it } from "vitest";

import { UpstashInquiryStore } from "@/lib/inquiries/upstash-store";

type EvalCall = {
  script: string;
  keys: string[];
  args: unknown[];
};

class FakeRedis {
  evalCalls: EvalCall[] = [];
  setCalls: Array<{ key: string; value: string; options: unknown }> = [];
  setResult: "OK" | null = "OK";
  evalResult: unknown = 1;

  async eval(script: string, keys: string[], args: unknown[]) {
    this.evalCalls.push({ script, keys, args });
    return this.evalResult;
  }

  async set(key: string, value: string, options: unknown) {
    this.setCalls.push({ key, value, options });
    return this.setResult;
  }
}

function setup(namespace = "caleb:preview") {
  const redis = new FakeRedis();
  const store = new UpstashInquiryStore(redis as never, namespace);
  return { redis, store };
}

describe("Upstash inquiry coordination", () => {
  it("fails closed when the namespace is missing or invalid", () => {
    const redis = new FakeRedis();

    expect(() => new UpstashInquiryStore(redis as never, "")).toThrow(
      "A valid inquiry Redis namespace is required.",
    );
    expect(() => new UpstashInquiryStore(redis as never, "caleb")).toThrow(
      "A valid inquiry Redis namespace is required.",
    );
    expect(() => new UpstashInquiryStore(redis as never, "Caleb:Preview")).toThrow(
      "A valid inquiry Redis namespace is required.",
    );
    expect(() => new UpstashInquiryStore(redis as never, " caleb:preview ")).toThrow(
      "A valid inquiry Redis namespace is required.",
    );
  });

  it("enforces a fixed-window rate limit", async () => {
    const { redis, store } = setup();
    redis.evalResult = [6, 42];

    await expect(store.incrementRateKey("rate-key", 900, 5)).resolves.toEqual({
      allowed: false,
      retryAfter: 42,
    });
    expect(redis.evalCalls[0]?.keys).toEqual(["caleb:preview:rate-key"]);
  });

  it("acquires and compare-owner releases a short processing lease", async () => {
    const { redis, store } = setup();

    await expect(
      store.acquireProcessingLease("processing:email-digest", "owner-a", 120),
    ).resolves.toBe(true);
    await expect(
      store.releaseProcessingLease("processing:email-digest", "owner-a"),
    ).resolves.toBe(true);

    expect(redis.setCalls[0]).toEqual({
      key: "caleb:preview:processing:email-digest",
      value: "owner-a",
      options: { nx: true, ex: 120 },
    });
    expect(redis.evalCalls[0]).toMatchObject({
      keys: ["caleb:preview:processing:email-digest"],
      args: ["owner-a"],
    });
  });

  it("keeps Preview and Production rate and lease operations in disjoint keyspaces", async () => {
    const redis = new FakeRedis();
    redis.evalResult = [1, 900];
    const preview = new UpstashInquiryStore(redis as never, "caleb:preview");
    const production = new UpstashInquiryStore(redis as never, "caleb:production");

    await preview.incrementRateKey("rate:shared-digest", 900, 5);
    await production.incrementRateKey("rate:shared-digest", 900, 5);
    await preview.acquireProcessingLease("processing:shared-digest", "preview-owner", 120);
    await production.acquireProcessingLease("processing:shared-digest", "production-owner", 120);
    redis.evalResult = 1;
    await preview.releaseProcessingLease("processing:shared-digest", "preview-owner");
    await production.releaseProcessingLease("processing:shared-digest", "production-owner");

    expect(redis.evalCalls.map((call) => call.keys[0])).toEqual([
      "caleb:preview:rate:shared-digest",
      "caleb:production:rate:shared-digest",
      "caleb:preview:processing:shared-digest",
      "caleb:production:processing:shared-digest",
    ]);
    expect(redis.setCalls.map((call) => call.key)).toEqual([
      "caleb:preview:processing:shared-digest",
      "caleb:production:processing:shared-digest",
    ]);
    expect(
      [redis.evalCalls[0], redis.evalCalls[2]].every((call) =>
        call.keys.every((key) => !key.startsWith("caleb:production:")),
      ),
    ).toBe(true);
    expect(
      [redis.evalCalls[1], redis.evalCalls[3]].every((call) =>
        call.keys.every((key) => !key.startsWith("caleb:preview:")),
      ),
    ).toBe(true);
  });
});
