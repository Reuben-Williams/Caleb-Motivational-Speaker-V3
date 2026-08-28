import { describe, expect, it, vi } from "vitest";

import {
  createCheckoutAttemptService,
  type CheckoutAttemptRepository,
} from "./checkout-attempts";

const SITE_ID = "11111111-1111-4111-8111-111111111111";
const BUYER_INTENT_ID = "22222222-2222-4222-8222-222222222222";

describe("Preview checkout attempts", () => {
  it("issues a random 20-minute nonce while persisting its digest only", async () => {
    const reserve = vi.fn(async () => ({ status: "created" as const }));
    const repository: CheckoutAttemptRepository = { reserve };
    const service = createCheckoutAttemptService({
      repository,
      randomBytes: () => Buffer.alloc(32, 9),
    });

    const result = await service.startNewAttempt({
      siteId: SITE_ID,
      buyerIntentId: BUYER_INTENT_ID,
      offerStableKey: "caleb-print-book-preview-test",
      requestedAt: "2026-08-27T20:00:00.000Z",
    });

    expect(result.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.expiresAt).toBe("2026-08-27T20:20:00.000Z");
    expect(result.attemptId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.checkoutId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.idempotencyKey).toBe(`caleb-preview:${result.attemptId}`);
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({
      siteId: SITE_ID,
      buyerIntentId: BUYER_INTENT_ID,
      attemptId: result.attemptId,
      checkoutId: result.checkoutId,
      nonceDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: "2026-08-27T20:20:00.000Z",
    }));
    expect(JSON.stringify(reserve.mock.calls)).not.toContain(result.nonce);
  });

  it("creates a distinct explicit attempt for each new test purchase", async () => {
    const repository: CheckoutAttemptRepository = {
      reserve: vi.fn(async () => ({ status: "created" as const })),
    };
    const bytes = [Buffer.alloc(32, 1), Buffer.alloc(32, 2)];
    const service = createCheckoutAttemptService({ repository, randomBytes: () => bytes.shift()! });
    const input = {
      siteId: SITE_ID,
      buyerIntentId: BUYER_INTENT_ID,
      offerStableKey: "caleb-print-book-preview-test",
      requestedAt: "2026-08-27T20:00:00.000Z",
    } as const;

    const first = await service.startNewAttempt(input);
    const second = await service.startNewAttempt(input);

    expect(second.nonce).not.toBe(first.nonce);
    expect(second.attemptId).not.toBe(first.attemptId);
    expect(second.checkoutId).not.toBe(first.checkoutId);
  });
});
