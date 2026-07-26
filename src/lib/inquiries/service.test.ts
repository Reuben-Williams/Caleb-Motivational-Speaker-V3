import { describe, expect, it } from "vitest";

import {
  createInquiryService,
  type InquiryDelivery,
  type InquiryRecord,
  type InquiryStore,
  type SpamVerifier,
} from "@/lib/inquiries/service";
import { validBooking } from "../../../tests/booking-fixture";

class TestStore implements InquiryStore {
  records = new Map<string, InquiryRecord>();
  rateAllowed = true;
  rateRetryAfter = 0;
  confirmationLock = true;
  failBusinessTransition = false;

  async incrementRateKey() {
    return {
      allowed: this.rateAllowed,
      retryAfter: this.rateRetryAfter,
    };
  }

  async reserveInquiry(key: string, inquiryId: string) {
    const current = this.records.get(key);
    if (current && current.state !== "business_failed") {
      return false;
    }
    this.records.set(key, {
      inquiryId,
      state: "processing",
      confirmationEmailSent: false,
    });
    return true;
  }

  async readInquiry(key: string) {
    return this.records.get(key) ?? null;
  }

  async markBusinessDelivered(key: string) {
    if (this.failBusinessTransition) {
      throw new Error("transition unavailable");
    }
    const record = this.records.get(key);
    if (!record || record.state !== "processing") {
      throw new Error("invalid state");
    }
    this.records.set(key, { ...record, state: "accepted" });
  }

  async markBusinessFailed(key: string) {
    const record = this.records.get(key);
    if (record) {
      this.records.set(key, { ...record, state: "business_failed" });
    }
  }

  async acquireConfirmationRetry() {
    return this.confirmationLock;
  }

  async markConfirmationSent(key: string) {
    const record = this.records.get(key);
    if (record) {
      this.records.set(key, {
        ...record,
        state: "accepted",
        confirmationEmailSent: true,
      });
    }
  }
}

class TestDelivery implements InquiryDelivery {
  businessSends = 0;
  confirmationSends = 0;
  businessFailure: Error | null = null;
  confirmationFailure: Error | null = null;

  async sendBusiness() {
    this.businessSends += 1;
    if (this.businessFailure) throw this.businessFailure;
  }

  async sendConfirmation() {
    this.confirmationSends += 1;
    if (this.confirmationFailure) throw this.confirmationFailure;
  }
}

const passingSpam: SpamVerifier = {
  verify: async () => true,
};

function setup() {
  const store = new TestStore();
  const delivery = new TestDelivery();
  const service = createInquiryService({
    hmacSecret: "test-secret-with-enough-entropy",
    store,
    delivery,
    spam: passingSpam,
  });
  return { service, store, delivery };
}

describe("inquiry service", () => {
  it("accepts a valid inquiry and sends both messages once", async () => {
    const { service, delivery } = setup();

    const result = await service.submit(validBooking, {
      trustedClientIp: "203.0.113.10",
    });

    expect(result.status).toBe(202);
    expect(result.body.code).toBe("accepted");
    expect(result.body.inquiryId).toMatch(/^CJ-[A-F0-9]{12}$/);
    expect(result.body.confirmationEmailSent).toBe(true);
    expect(delivery.businessSends).toBe(1);
    expect(delivery.confirmationSends).toBe(1);
  });

  it("returns an accepted duplicate without repeating business delivery", async () => {
    const { service, delivery } = setup();
    const first = await service.submit(validBooking, {});
    const duplicate = await service.submit(validBooking, {});

    expect(first.status).toBe(202);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.code).toBe("duplicate_accepted");
    expect(delivery.businessSends).toBe(1);
    expect(delivery.confirmationSends).toBe(1);
  });

  it("reports an identical active inquiry as processing", async () => {
    const { service, store, delivery } = setup();
    delivery.businessFailure = new Error("hold");
    store.markBusinessFailed = async () => {};

    await service.submit(validBooking, {});
    const result = await service.submit(validBooking, {});

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("inquiry_processing");
    expect(result.retryAfter).toBe(5);
  });

  it("allows immediate retry after business delivery fails", async () => {
    const { service, store, delivery } = setup();
    delivery.businessFailure = new Error("provider down");

    const failed = await service.submit(validBooking, {});
    expect(failed.status).toBe(502);
    expect([...store.records.values()][0]?.state).toBe("business_failed");

    delivery.businessFailure = null;
    const retry = await service.submit(validBooking, {});
    expect(retry.status).toBe(202);
    expect(delivery.businessSends).toBe(2);
  });

  it("accepts business delivery when confirmation delivery fails", async () => {
    const { service, delivery } = setup();
    delivery.confirmationFailure = new Error("confirmation down");

    const result = await service.submit(validBooking, {});

    expect(result.status).toBe(202);
    expect(result.body.confirmationEmailSent).toBe(false);
  });

  it("retries a missing confirmation once on an accepted duplicate", async () => {
    const { service, delivery } = setup();
    delivery.confirmationFailure = new Error("confirmation down");
    await service.submit(validBooking, {});

    delivery.confirmationFailure = null;
    const duplicate = await service.submit(validBooking, {});

    expect(duplicate.status).toBe(200);
    expect(duplicate.body.confirmationEmailSent).toBe(true);
    expect(delivery.businessSends).toBe(1);
    expect(delivery.confirmationSends).toBe(2);
  });

  it("rejects spam and rate-limited requests before delivery", async () => {
    const { store, delivery } = setup();
    const spamService = createInquiryService({
      hmacSecret: "test-secret-with-enough-entropy",
      store,
      delivery,
      spam: { verify: async () => false },
    });
    const spam = await spamService.submit(validBooking, {});
    expect(spam.status).toBe(400);
    expect(spam.body.code).toBe("spam_failed");

    const { service, store: limitedStore, delivery: limitedDelivery } = setup();
    limitedStore.rateAllowed = false;
    limitedStore.rateRetryAfter = 420;
    const limited = await service.submit(validBooking, {});
    expect(limited.status).toBe(429);
    expect(limited.retryAfter).toBe(420);
    expect(limitedDelivery.businessSends).toBe(0);
  });

  it("keeps stable IDs and provider idempotency keys for the same payload", async () => {
    const captures: Array<{ inquiryId: string; idempotencyKey: string }> = [];
    const store = new TestStore();
    const delivery: InquiryDelivery = {
      async sendBusiness(message) {
        captures.push({
          inquiryId: message.inquiryId,
          idempotencyKey: message.idempotencyKey,
        });
      },
      async sendConfirmation() {},
    };
    const service = createInquiryService({
      hmacSecret: "test-secret-with-enough-entropy",
      store,
      delivery,
      spam: passingSpam,
    });

    await service.submit(validBooking, {});
    const first = captures[0];
    store.records.clear();
    await service.submit(validBooking, {});

    expect(captures[1]).toEqual(first);
    expect(first?.idempotencyKey).toMatch(
      /^business-inquiry\/[a-f0-9]{48}$/,
    );
  });
});
