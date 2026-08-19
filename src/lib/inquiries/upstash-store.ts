import { Redis } from "@upstash/redis";

import type {
  InquiryIdentityCandidate,
} from "@/lib/inquiries/identity";
import { ACCEPTED_INQUIRY_TTL_SECONDS } from "@/lib/inquiries/identity";
import {
  parseInquiryRecord,
  type InquiryRecord,
} from "@/lib/inquiries/state";

const INCOMPLETE_INQUIRY_TTL_SECONDS = 24 * 60 * 60;

const rateScript = `
-- inquiry-rate
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("TTL", KEYS[1])
return {count, ttl}
`;

const reserveScript = `
-- inquiry-reserve
local current = redis.call("GET", KEYS[1])
if not current then
  local created = redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2], "NX")
  if created then return 1 else return 0 end
end
local record = cjson.decode(current)
local ownedAndExpired = (record.state == "processing" or record.state == "contact_resolved") and record.leaseExpiresAt <= ARGV[3]
if record.state == "business_failed" or ownedAndExpired then
  redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2], "XX")
  return 1
end
return 0
`;

const contactScript = `
-- inquiry-contact
local current = redis.call("GET", KEYS[1])
if not current then return 0 end
local record = cjson.decode(current)
if record.state ~= "processing" or record.ownerToken ~= ARGV[1] then return 0 end
record.state = "contact_resolved"
record.contactId = ARGV[2]
record.leaseExpiresAt = ARGV[3]
redis.call("SET", KEYS[1], cjson.encode(record), "EX", ARGV[4], "XX")
return 1
`;

const failureScript = `
-- inquiry-failure
local current = redis.call("GET", KEYS[1])
if not current then return 0 end
local record = cjson.decode(current)
if (record.state ~= "processing" and record.state ~= "contact_resolved") or record.ownerToken ~= ARGV[1] then return 0 end
local failed = {
  state = "business_failed",
  inquiryId = record.inquiryId,
  keyId = record.keyId,
  failedOperation = ARGV[2]
}
if record.contactId then failed.contactId = record.contactId end
redis.call("SET", KEYS[1], cjson.encode(failed), "EX", ARGV[3], "XX")
return 1
`;

const acceptScript = `
-- inquiry-accept
local current = redis.call("GET", KEYS[1])
if not current then return 0 end
local record = cjson.decode(current)
if record.state ~= "contact_resolved" or record.ownerToken ~= ARGV[1] or record.contactId ~= ARGV[2] then return 0 end
local accepted = {
  state = "accepted",
  inquiryId = record.inquiryId,
  keyId = record.keyId,
  contactId = record.contactId,
  opportunityId = ARGV[3],
  acceptedAt = ARGV[4]
}
redis.call("SET", KEYS[1], cjson.encode(accepted), "EX", ARGV[5], "XX")
return 1
`;

const renewLeaseScript = `
-- contact-lease-renew
local current = redis.call("GET", KEYS[1])
if current ~= ARGV[1] then return 0 end
return redis.call("EXPIRE", KEYS[1], ARGV[2])
`;

const releaseLeaseScript = `
-- contact-lease-release
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
  get<T = unknown>(key: string): Promise<T | null>;
  set(
    key: string,
    value: string,
    options: { nx: true; ex: number },
  ): Promise<"OK" | null>;
};

export type InquiryReservation = {
  ledgerKey: string;
  inquiryId: string;
  keyId: string;
  ownerToken: string;
};

export type StoredInquiry = {
  ledgerKey: string;
  record: InquiryRecord;
};

export interface InquiryStore {
  incrementRateKey(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; retryAfter: number }>;
  readInquiry(
    candidates: readonly InquiryIdentityCandidate[],
  ): Promise<StoredInquiry | null>;
  reserveInquiry(
    candidate: InquiryIdentityCandidate,
    ownerToken: string,
    now: Date,
    ttlSeconds: number,
  ): Promise<InquiryReservation | null>;
  recordContact(
    reservation: InquiryReservation,
    contactId: string,
    now: Date,
  ): Promise<void>;
  recordFailure(
    reservation: InquiryReservation,
    operation: string,
  ): Promise<void>;
  acceptInquiry(
    reservation: InquiryReservation,
    contactId: string,
    opportunityId: string,
    acceptedAt: Date,
  ): Promise<void>;
  acquireContactLease(
    key: string,
    ownerToken: string,
    ttlSeconds: number,
  ): Promise<boolean>;
  renewContactLease(
    key: string,
    ownerToken: string,
    ttlSeconds: number,
  ): Promise<boolean>;
  releaseContactLease(key: string, ownerToken: string): Promise<boolean>;
}

export class UpstashInquiryStore implements InquiryStore {
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

  async readInquiry(
    candidates: readonly InquiryIdentityCandidate[],
  ): Promise<StoredInquiry | null> {
    for (const candidate of candidates) {
      const value = await this.redis.get(candidate.ledgerKey);
      if (value !== null) {
        return {
          ledgerKey: candidate.ledgerKey,
          record: parseInquiryRecord(value),
        };
      }
    }
    return null;
  }

  async reserveInquiry(
    candidate: InquiryIdentityCandidate,
    ownerToken: string,
    now: Date,
    ttlSeconds: number,
  ): Promise<InquiryReservation | null> {
    const record: InquiryRecord = {
      state: "processing",
      inquiryId: candidate.inquiryId,
      keyId: candidate.keyId,
      ownerToken,
      leaseExpiresAt: new Date(now.getTime() + ttlSeconds * 1_000).toISOString(),
    };
    const changed = await this.redis.eval<number>(
      reserveScript,
      [candidate.ledgerKey],
      [JSON.stringify(record), ttlSeconds, now.toISOString()],
    );
    if (Number(changed) !== 1) return null;
    return {
      ledgerKey: candidate.ledgerKey,
      inquiryId: candidate.inquiryId,
      keyId: candidate.keyId,
      ownerToken,
    };
  }

  async recordContact(
    reservation: InquiryReservation,
    contactId: string,
    now: Date,
  ): Promise<void> {
    const expiresAt = new Date(
      now.getTime() + INCOMPLETE_INQUIRY_TTL_SECONDS * 1_000,
    ).toISOString();
    const changed = await this.redis.eval<number>(
      contactScript,
      [reservation.ledgerKey],
      [
        reservation.ownerToken,
        contactId,
        expiresAt,
        INCOMPLETE_INQUIRY_TTL_SECONDS,
      ],
    );
    this.requireOwnerTransition(changed);
  }

  async recordFailure(
    reservation: InquiryReservation,
    operation: string,
  ): Promise<void> {
    const changed = await this.redis.eval<number>(
      failureScript,
      [reservation.ledgerKey],
      [
        reservation.ownerToken,
        operation,
        INCOMPLETE_INQUIRY_TTL_SECONDS,
      ],
    );
    this.requireOwnerTransition(changed);
  }

  async acceptInquiry(
    reservation: InquiryReservation,
    contactId: string,
    opportunityId: string,
    acceptedAt: Date,
  ): Promise<void> {
    const changed = await this.redis.eval<number>(
      acceptScript,
      [reservation.ledgerKey],
      [
        reservation.ownerToken,
        contactId,
        opportunityId,
        acceptedAt.toISOString(),
        ACCEPTED_INQUIRY_TTL_SECONDS,
      ],
    );
    this.requireOwnerTransition(changed);
  }

  async acquireContactLease(
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

  async renewContactLease(
    key: string,
    ownerToken: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const changed = await this.redis.eval<number>(
      renewLeaseScript,
      [key],
      [ownerToken, ttlSeconds],
    );
    return Number(changed) === 1;
  }

  async releaseContactLease(
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

  private requireOwnerTransition(changed: number) {
    if (Number(changed) !== 1) {
      throw new Error("Inquiry transition rejected by owner check.");
    }
  }
}
