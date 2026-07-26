import { Redis } from "@upstash/redis";

import type {
  InquiryRecord,
  InquiryStore,
} from "@/lib/inquiries/service";

const rateScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("TTL", KEYS[1])
return {count, ttl}
`;

const reserveScript = `
local current = redis.call("GET", KEYS[1])
if not current then
  local created = redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2], "NX")
  if created then return 1 else return 0 end
end
local record = cjson.decode(current)
if record.state == "business_failed" then
  redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2], "XX")
  return 1
end
return 0
`;

const transitionScript = `
local current = redis.call("GET", KEYS[1])
if not current then return 0 end
local record = cjson.decode(current)
if record.state ~= ARGV[1] then return 0 end
record.state = ARGV[2]
if ARGV[3] ~= "" then
  record.confirmationEmailSent = ARGV[3] == "true"
end
redis.call("SET", KEYS[1], cjson.encode(record), "EX", ARGV[4], "XX")
return 1
`;

function parseRecord(value: unknown): InquiryRecord | null {
  try {
    const record =
      typeof value === "string" ? JSON.parse(value) : (value as InquiryRecord);
    if (
      record &&
      typeof record.inquiryId === "string" &&
      ["processing", "accepted", "business_failed"].includes(record.state) &&
      typeof record.confirmationEmailSent === "boolean"
    ) {
      return record;
    }
  } catch {
    // Corrupt state is treated as unavailable rather than accepted.
  }
  return null;
}

export class UpstashInquiryStore implements InquiryStore {
  readonly redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  async incrementRateKey(
    key: string,
    windowSeconds: number,
    limit: number,
  ) {
    const [count, ttl] = await this.redis.eval<
      [number],
      [number, number]
    >(rateScript, [key], [windowSeconds]);
    return {
      allowed: Number(count) <= limit,
      retryAfter: Math.max(1, Number(ttl)),
    };
  }

  async reserveInquiry(
    key: string,
    inquiryId: string,
    ttlSeconds: number,
  ) {
    const result = await this.redis.eval<[string, number], number>(
      reserveScript,
      [key],
      [
        JSON.stringify({
          inquiryId,
          state: "processing",
          confirmationEmailSent: false,
        }),
        ttlSeconds,
      ],
    );
    return Number(result) === 1;
  }

  async readInquiry(key: string) {
    return parseRecord(await this.redis.get(key));
  }

  async markBusinessDelivered(key: string) {
    const changed = await this.redis.eval<
      [string, string, string, number],
      number
    >(transitionScript, [key], ["processing", "accepted", "false", 86_400]);
    if (Number(changed) !== 1) {
      throw new Error("Unable to mark inquiry accepted.");
    }
  }

  async markBusinessFailed(key: string) {
    const changed = await this.redis.eval<
      [string, string, string, number],
      number
    >(
      transitionScript,
      [key],
      ["processing", "business_failed", "false", 900],
    );
    if (Number(changed) !== 1) {
      throw new Error("Unable to release failed inquiry.");
    }
  }

  async acquireConfirmationRetry(key: string, ttlSeconds: number) {
    const lock = await this.redis.set(`confirmation-lock:${key}`, "1", {
      nx: true,
      ex: ttlSeconds,
    });
    return lock === "OK";
  }

  async markConfirmationSent(key: string) {
    const current = await this.readInquiry(key);
    if (!current || current.state !== "accepted") {
      throw new Error("Unable to mark confirmation sent.");
    }
    const changed = await this.redis.eval<
      [string, string, string, number],
      number
    >(transitionScript, [key], ["accepted", "accepted", "true", 86_400]);
    if (Number(changed) !== 1) {
      throw new Error("Unable to mark confirmation sent.");
    }
  }
}
