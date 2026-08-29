import { createHash } from "node:crypto";

import { Resend } from "resend";

import type {
  InquiryDeliveryResult,
  InquiryOutboxClaim,
  InquiryOutboxDelivery,
} from "@/lib/inquiries/outbox-worker";

type ResendResponse = Readonly<{
  data: Readonly<{ id: string }> | null;
  error: Readonly<{ statusCode?: number }> | null;
}>;

type ResendClient = Readonly<{
  emails: Readonly<{
    send(
      message: Readonly<{
        from: string;
        to: string;
        replyTo: string;
        subject: string;
        text: string;
      }>,
      options: Readonly<{ idempotencyKey: string }>,
    ): Promise<ResendResponse>;
  }>;
}>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeEmail(value: string): boolean {
  return value.length <= 320 && emailPattern.test(value);
}

function authorized(
  claim: InquiryOutboxClaim,
  from: string,
  notificationEmail: string,
): boolean {
  if (claim.sender !== from || !safeEmail(claim.replyTo)) return false;
  if (
    claim.messageKind === "organizer_acknowledgement" &&
    claim.recipientKind === "organizer"
  ) {
    return safeEmail(claim.destination) && claim.replyTo === notificationEmail;
  }
  if (
    claim.messageKind === "internal_notification" &&
    claim.recipientKind === "internal"
  ) {
    return claim.destination === notificationEmail;
  }
  return false;
}

function classify(error: Readonly<{ statusCode?: number }>): InquiryDeliveryResult {
  if (error.statusCode === 429) {
    return {
      outcome: "failed_retryable",
      safeReasonCode: "PROVIDER_RATE_LIMITED",
    };
  }
  if (typeof error.statusCode === "number" && error.statusCode >= 500) {
    return {
      outcome: "failed_retryable",
      safeReasonCode: "PROVIDER_TRANSIENT",
    };
  }
  return { outcome: "dead_letter", safeReasonCode: "PROVIDER_REJECTED" };
}

export function createResendOutboxDelivery(input: Readonly<{
  apiKey?: string;
  client?: ResendClient;
  from: string;
  notificationEmail: string;
}>): InquiryOutboxDelivery {
  const client = input.client ?? (new Resend(input.apiKey) as unknown as ResendClient);
  const notificationEmail = input.notificationEmail.trim().toLowerCase();
  return Object.freeze({
    async deliver(claim: InquiryOutboxClaim): Promise<InquiryDeliveryResult> {
      if (!authorized(claim, input.from, notificationEmail)) {
        return {
          outcome: "dead_letter",
          safeReasonCode: "RECIPIENT_NOT_AUTHORIZED",
        };
      }
      try {
        const response = await client.emails.send(
          {
            from: claim.sender,
            to: claim.destination,
            replyTo: claim.replyTo,
            subject: claim.subject,
            text: claim.bodyText,
          },
          { idempotencyKey: claim.idempotencyKey },
        );
        if (response.error) return classify(response.error);
        if (!response.data?.id) {
          return {
            outcome: "reconciliation_required",
            safeReasonCode: "PROVIDER_OUTCOME_UNCERTAIN",
          };
        }
        return {
          outcome: "delivered",
          providerReference: response.data.id,
          providerReferenceDigest: createHash("sha256")
            .update(response.data.id)
            .digest("hex"),
        };
      } catch {
        return {
          outcome: "reconciliation_required",
          safeReasonCode: "PROVIDER_OUTCOME_UNCERTAIN",
        };
      }
    },
  });
}
