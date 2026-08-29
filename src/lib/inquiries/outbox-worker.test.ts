import { describe, expect, it, vi } from "vitest";

import {
  createOutboxWorker,
  type InquiryOutboxClaim,
  type InquiryOutboxCompletion,
} from "@/lib/inquiries/outbox-worker";

const claim = (overrides: Partial<InquiryOutboxClaim> = {}): InquiryOutboxClaim => ({
  outboxId: "11111111-1111-4111-8111-111111111111",
  submissionId: "22222222-2222-4222-8222-222222222222",
  messageKind: "organizer_acknowledgement",
  recipientKind: "organizer",
  destination: "organizer@example.com",
  sender: "Caleb Jakes <bookings@mail.calebjakes.com>",
  replyTo: "info@calebjakes.com",
  subject: "Inquiry received",
  bodyText: "Thank you.",
  idempotencyKey: "inquiry:CJ-ABCDEF123456:organizer",
  attempt: 1,
  leaseToken: "33333333-3333-4333-8333-333333333333",
  leaseExpiresAt: "2026-08-29T12:01:00.000Z",
  ...overrides,
});

describe("native inquiry outbox worker", () => {
  it("claims once and completes every result with the fenced lease token", async () => {
    const claims = [
      claim(),
      claim({
        outboxId: "44444444-4444-4444-8444-444444444444",
        leaseToken: "55555555-5555-4555-8555-555555555555",
        messageKind: "internal_notification",
        recipientKind: "internal",
        destination: "info@calebjakes.com",
        replyTo: "organizer@example.com",
      }),
    ];
    const complete = vi.fn<(result: InquiryOutboxCompletion) => Promise<void>>()
      .mockResolvedValue(undefined);
    const repository = {
      claim: vi.fn().mockResolvedValue(claims),
      complete,
    };
    const deliver = vi.fn()
      .mockResolvedValueOnce({
        outcome: "delivered",
        providerReference: "email_123",
        providerReferenceDigest: "a".repeat(64),
      })
      .mockResolvedValueOnce({
        outcome: "failed_retryable",
        safeReasonCode: "PROVIDER_RATE_LIMITED",
      });

    const result = await createOutboxWorker({
      repository,
      delivery: { deliver },
      workerId: "caleb-inquiry-email",
      limit: 20,
    }).run();

    expect(repository.claim).toHaveBeenCalledWith("caleb-inquiry-email", 20);
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenNthCalledWith(1, {
      outboxId: claims[0].outboxId,
      leaseToken: claims[0].leaseToken,
      outcome: "delivered",
      providerReference: "email_123",
      providerReferenceDigest: "a".repeat(64),
    });
    expect(complete).toHaveBeenNthCalledWith(2, {
      outboxId: claims[1].outboxId,
      leaseToken: claims[1].leaseToken,
      outcome: "failed_retryable",
      safeReasonCode: "PROVIDER_RATE_LIMITED",
    });
    expect(result).toEqual({
      claimed: 2,
      delivered: 1,
      failedRetryable: 1,
      deadLetter: 0,
      reconciliationRequired: 0,
    });
  });

  it("converts an unexpected delivery throw into reconciliation instead of retrying blindly", async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    const worker = createOutboxWorker({
      repository: {
        claim: vi.fn().mockResolvedValue([claim()]),
        complete,
      },
      delivery: {
        deliver: vi.fn().mockRejectedValue(new Error("connection reset")),
      },
      workerId: "caleb-inquiry-email",
    });

    await expect(worker.run()).resolves.toMatchObject({
      reconciliationRequired: 1,
    });
    expect(complete).toHaveBeenCalledWith({
      outboxId: claim().outboxId,
      leaseToken: claim().leaseToken,
      outcome: "reconciliation_required",
      safeReasonCode: "PROVIDER_OUTCOME_UNCERTAIN",
    });
  });

  it("returns a safe zero summary when no work is ready", async () => {
    const complete = vi.fn();
    const result = await createOutboxWorker({
      repository: {
        claim: vi.fn().mockResolvedValue([]),
        complete,
      },
      delivery: { deliver: vi.fn() },
      workerId: "caleb-inquiry-email",
    }).run();

    expect(result.claimed).toBe(0);
    expect(complete).not.toHaveBeenCalled();
  });
});
