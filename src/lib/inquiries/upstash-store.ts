import { Redis } from "@upstash/redis";

const rateScript = `
-- inquiry-rate
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("TTL", KEYS[1])
return {count, ttl}
`;

const releaseLeaseScript = `
-- inquiry-processing-lease-release
local current = redis.call("GET", KEYS[1])
if current ~= ARGV[1] then return 0 end
return redis.call("DEL", KEYS[1])
`;

type RedisAdapter = {
  eval<T = unknown>(
    script: string,
    keys: string[],
    args: unknown[],
  ): Promise<T>;
  set(
    key: string,
    value: string,
    options: { nx: true; ex: number },
  ): Promise<"OK" | null>;
};

export class UpstashInquiryStore {
  readonly redis: RedisAdapter;

  constructor(url: string, token: string);
  constructor(redis: RedisAdapter);
  constructor(urlOrRedis: string | RedisAdapter, token?: string) {
    if (typeof urlOrRedis === "string") {
      if (!token) throw new Error("Upstash token is required.");
      this.redis = new Redis({ url: urlOrRedis, token }) as RedisAdapter;
    } else {
      this.redis = urlOrRedis;
    }
  }

  async incrementRateKey(
    key: string,
    windowSeconds: number,
    limit: number,
  ) {
    const [count, ttl] = await this.redis.eval<[number, number]>(
      rateScript,
      [key],
      [windowSeconds],
    );
    return {
      allowed: Number(count) <= limit,
      retryAfter: Math.max(1, Number(ttl)),
    };
  }

  async acquireProcessingLease(
    key: string,
    ownerToken: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    return (
      (await this.redis.set(key, ownerToken, {
        nx: true,
        ex: ttlSeconds,
      })) === "OK"
    );
  }

  async releaseProcessingLease(
    key: string,
    ownerToken: string,
  ): Promise<boolean> {
    const changed = await this.redis.eval<number>(
      releaseLeaseScript,
      [key],
      [ownerToken],
    );
    return Number(changed) === 1;
  }
}
