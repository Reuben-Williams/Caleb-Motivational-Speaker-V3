import { describe, expect, it, vi } from "vitest";

import { createResendOutboxDelivery } from "@/lib/inquiries/resend-delivery";
import type { InquiryOutboxClaim } from "@/lib/inquiries/outbox-worker";

const base: InquiryOutboxClaim = {
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
};

function delivery(send = vi.fn()) {
  return {
    send,
    delivery: createResendOutboxDelivery({
      client: { emails: { send } },
      from: base.sender,
      notificationEmail: "info@calebjakes.com",
    }),
  };
}

describe("Resend inquiry outbox delivery", () => {
  it("sends an authorized organizer acknowledgement with provider idempotency", async () => {
    const { send, delivery: adapter } = delivery(
      vi.fn().mockResolvedValue({ data: { id: "email_123" }, error: null }),
    );

    await expect(adapter.deliver(base)).resolves.toEqual({
      outcome: "delivered",
      providerReference: "email_123",
      providerReferenceDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(send).toHaveBeenCalledWith(
      {
        from: base.sender,
        to: base.destination,
        replyTo: base.replyTo,
        subject: base.subject,
        text: base.bodyText,
      },
      { idempotencyKey: base.idempotencyKey },
    );
  });

  it("allows only the configured internal mailbox for internal notifications", async () => {
    const { send, delivery: adapter } = delivery();
    const malicious: InquiryOutboxClaim = {
      ...base,
      messageKind: "internal_notification",
      recipientKind: "internal",
      destination: "attacker@example.com",
      replyTo: "organizer@example.com",
    };

    await expect(adapter.deliver(malicious)).resolves.toEqual({
      outcome: "dead_letter",
      safeReasonCode: "RECIPIENT_NOT_AUTHORIZED",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a sender or message/recipient pairing that is not configured", async () => {
    const { send, delivery: adapter } = delivery();

    await expect(
      adapter.deliver({ ...base, sender: "spoof@example.com" }),
    ).resolves.toMatchObject({ outcome: "dead_letter" });
    await expect(
      adapter.deliver({ ...base, messageKind: "internal_notification" }),
    ).resolves.toMatchObject({ outcome: "dead_letter" });
    expect(send).not.toHaveBeenCalled();
  });

  it("classifies provider responses without exposing provider messages", async () => {
    const transient = delivery(
      vi.fn().mockResolvedValue({ data: null, error: { statusCode: 429 } }),
    ).delivery;
    const permanent = delivery(
      vi.fn().mockResolvedValue({ data: null, error: { statusCode: 422 } }),
    ).delivery;
    const uncertain = delivery(
      vi.fn().mockRejectedValue(new Error("socket closed")),
    ).delivery;

    await expect(transient.deliver(base)).resolves.toEqual({
      outcome: "failed_retryable",
      safeReasonCode: "PROVIDER_RATE_LIMITED",
    });
    await expect(permanent.deliver(base)).resolves.toEqual({
      outcome: "dead_letter",
      safeReasonCode: "PROVIDER_REJECTED",
    });
    await expect(uncertain.deliver(base)).resolves.toEqual({
      outcome: "reconciliation_required",
      safeReasonCode: "PROVIDER_OUTCOME_UNCERTAIN",
    });
  });
});
