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

function setup() {
  const redis = new FakeRedis();
  const store = new UpstashInquiryStore(redis as never);
  return { redis, store };
}

describe("Upstash inquiry coordination", () => {
  it("enforces a fixed-window rate limit", async () => {
    const { redis, store } = setup();
    redis.evalResult = [6, 42];

    await expect(store.incrementRateKey("rate-key", 900, 5)).resolves.toEqual({
      allowed: false,
      retryAfter: 42,
    });
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
      key: "processing:email-digest",
      value: "owner-a",
      options: { nx: true, ex: 120 },
    });
    expect(redis.evalCalls[0]).toMatchObject({
      keys: ["processing:email-digest"],
      args: ["owner-a"],
    });
  });
});
