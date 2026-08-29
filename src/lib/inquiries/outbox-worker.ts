export type InquiryOutboxClaim = Readonly<{
  outboxId: string;
  submissionId: string;
  messageKind: "organizer_acknowledgement" | "internal_notification";
  recipientKind: "organizer" | "internal";
  destination: string;
  sender: string;
  replyTo: string;
  subject: string;
  bodyText: string;
  idempotencyKey: string;
  attempt: number;
  leaseToken: string;
  leaseExpiresAt: string;
}>;

export type InquiryDeliveryResult =
  | Readonly<{
      outcome: "delivered";
      providerReference: string;
      providerReferenceDigest: string;
    }>
  | Readonly<{
      outcome:
        | "failed_retryable"
        | "dead_letter"
        | "reconciliation_required";
      safeReasonCode: string;
    }>;

export type InquiryOutboxCompletion = Readonly<{
  outboxId: string;
  leaseToken: string;
  outcome: InquiryDeliveryResult["outcome"];
  providerReference?: string;
  providerReferenceDigest?: string;
  safeReasonCode?: string;
}>;

export interface InquiryOutboxRepository {
  claim(workerId: string, limit: number): Promise<readonly InquiryOutboxClaim[]>;
  complete(result: InquiryOutboxCompletion): Promise<void>;
}

export interface InquiryOutboxDelivery {
  deliver(claim: InquiryOutboxClaim): Promise<InquiryDeliveryResult>;
}

export function createOutboxWorker(input: Readonly<{
  repository: InquiryOutboxRepository;
  delivery: InquiryOutboxDelivery;
  workerId: string;
  limit?: number;
}>) {
  const limit = input.limit ?? 20;
  return Object.freeze({
    async run() {
      const claims = await input.repository.claim(input.workerId, limit);
      const summary = {
        claimed: claims.length,
        delivered: 0,
        failedRetryable: 0,
        deadLetter: 0,
        reconciliationRequired: 0,
      };
      for (const claim of claims) {
        let result: InquiryDeliveryResult;
        try {
          result = await input.delivery.deliver(claim);
        } catch {
          result = {
            outcome: "reconciliation_required",
            safeReasonCode: "PROVIDER_OUTCOME_UNCERTAIN",
          };
        }
        await input.repository.complete({
          outboxId: claim.outboxId,
          leaseToken: claim.leaseToken,
          ...result,
        });
        if (result.outcome === "delivered") summary.delivered += 1;
        else if (result.outcome === "failed_retryable") summary.failedRetryable += 1;
        else if (result.outcome === "dead_letter") summary.deadLetter += 1;
        else summary.reconciliationRequired += 1;
      }
      return Object.freeze(summary);
    },
  });
}
