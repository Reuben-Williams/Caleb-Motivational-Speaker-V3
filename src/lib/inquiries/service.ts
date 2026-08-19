import {
  bookingSchema,
  type BookingData,
  type BookingInput,
} from "@/lib/booking-schema";
import { rateDigest } from "@/lib/inquiries/canonical";
import {
  inquiryIdentityCandidates,
  type InquiryIdentityCandidate,
  type InquiryIdentityKeyring,
} from "@/lib/inquiries/identity";
import {
  CONTACT_LEASE_ACQUIRE_BUDGET_MS,
  CONTACT_LEASE_RENEW_INTERVAL_MS,
  CONTACT_LEASE_TTL_SECONDS,
  CONTACT_RESOLUTION_BUDGET_MS,
  createLeaseOwnerToken,
  type InquiryRecord,
} from "@/lib/inquiries/state";
import type {
  InquiryStore,
  StoredInquiry,
} from "@/lib/inquiries/upstash-store";

export interface SpamVerifier {
  verify(token: string, trustedClientIp?: string): Promise<boolean>;
}

export interface InquiryGateway {
  resolveContact(
    data: BookingData,
    context: { signal: AbortSignal },
  ): Promise<{ contactId: string }>;
  findOrCreateOpportunity(input: {
    inquiryId: string;
    contactId: string;
    data: BookingData;
  }): Promise<{ opportunityId: string }>;
}

type ServiceBody = {
  code:
    | "accepted"
    | "duplicate_accepted"
    | "validation_failed"
    | "spam_failed"
    | "rate_limited"
    | "inquiry_processing"
    | "delivery_failed"
    | "service_unavailable"
    | "unexpected_error";
  message: string;
  inquiryId?: string;
  acceptedAt?: string;
  fieldErrors?: Record<string, string[]>;
  correlationId?: string;
};

export type InquiryResult = {
  status: 200 | 202 | 400 | 409 | 429 | 500 | 502 | 503;
  body: ServiceBody;
  retryAfter?: number;
};

type InquiryServiceDependencies = {
  identityKeyring: InquiryIdentityKeyring;
  store: InquiryStore;
  gateway: InquiryGateway;
  spam: SpamVerifier;
  now?: () => Date;
  monotonicNow?: () => number;
  ownerToken?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
};

const INQUIRY_RESERVATION_TTL_SECONDS = 15 * 60;
const CONTACT_LEASE_RETRY_MS = 250;
const acceptedMessage =
  "Your speaking inquiry was received. Keep the inquiry ID for your records.";
const alternativeMessage =
  "Please try again, call (404) 941-5670, or email info@calebjakes.com.";

function acceptedResult(
  status: 200 | 202,
  code: "accepted" | "duplicate_accepted",
  record: Extract<InquiryRecord, { state: "accepted" }>,
): InquiryResult {
  return {
    status,
    body: {
      code,
      message: acceptedMessage,
      inquiryId: record.inquiryId,
      acceptedAt: record.acceptedAt,
    },
  };
}

function candidateForStoredInquiry(
  stored: StoredInquiry | null,
  candidates: readonly InquiryIdentityCandidate[],
) {
  if (!stored) return candidates[0];
  return candidates.find(({ ledgerKey }) => ledgerKey === stored.ledgerKey);
}

function activeRecordIsOwned(stored: StoredInquiry, now: Date) {
  const { record } = stored;
  return (
    (record.state === "processing" || record.state === "contact_resolved") &&
    new Date(record.leaseExpiresAt).getTime() > now.getTime()
  );
}

export function createInquiryService({
  identityKeyring,
  store,
  gateway,
  spam,
  now = () => new Date(),
  monotonicNow = () => Date.now(),
  ownerToken = createLeaseOwnerToken,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: InquiryServiceDependencies) {
  async function acquireContactLease(
    key: string,
    owner: string,
  ): Promise<boolean> {
    const deadline = monotonicNow() + CONTACT_LEASE_ACQUIRE_BUDGET_MS;
    do {
      if (
        await store.acquireContactLease(
          key,
          owner,
          CONTACT_LEASE_TTL_SECONDS,
        )
      ) {
        return true;
      }
      const remaining = deadline - monotonicNow();
      if (remaining <= 0) return false;
      await sleep(Math.min(CONTACT_LEASE_RETRY_MS, remaining));
    } while (monotonicNow() <= deadline);
    return false;
  }

  async function resolveContactWithLease(
    data: BookingData,
    leaseKey: string,
    owner: string,
  ): Promise<{ contactId: string }> {
    const controller = new AbortController();
    let renewalRunning = false;
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => reject(new Error("Contact resolution lease was lost.")),
        { once: true },
      );
    });
    const timeout = setTimeout(
      () => controller.abort(),
      CONTACT_RESOLUTION_BUDGET_MS,
    );
    const renewal = setInterval(async () => {
      if (renewalRunning || controller.signal.aborted) return;
      renewalRunning = true;
      try {
        if (
          !(await store.renewContactLease(
            leaseKey,
            owner,
            CONTACT_LEASE_TTL_SECONDS,
          ))
        ) {
          controller.abort();
        }
      } catch {
        controller.abort();
      } finally {
        renewalRunning = false;
      }
    }, CONTACT_LEASE_RENEW_INTERVAL_MS);

    try {
      return await Promise.race([
        gateway.resolveContact(data, { signal: controller.signal }),
        aborted,
      ]);
    } finally {
      clearTimeout(timeout);
      clearInterval(renewal);
    }
  }

  return {
    async submit(
      input: BookingInput,
      context: { trustedClientIp?: string },
    ): Promise<InquiryResult> {
      const parsed = bookingSchema.safeParse(input);
      if (!parsed.success) {
        return {
          status: 400,
          body: {
            code: "validation_failed",
            message: "Please correct the highlighted fields.",
            fieldErrors: parsed.error.flatten().fieldErrors,
          },
        };
      }

      const data = parsed.data;
      if (!(await spam.verify(data.turnstileToken, context.trustedClientIp))) {
        return {
          status: 400,
          body: {
            code: "spam_failed",
            message: `We couldn't verify this request. ${alternativeMessage}`,
          },
        };
      }

      const rateKey = rateDigest(
        data.workEmail,
        context.trustedClientIp,
        identityKeyring.activeSecret,
      );
      const shortWindow = await store.incrementRateKey(
        `rate:15m:${rateKey}`,
        15 * 60,
        5,
      );
      if (!shortWindow.allowed) {
        return {
          status: 429,
          retryAfter: shortWindow.retryAfter,
          body: {
            code: "rate_limited",
            message: `Too many recent attempts. ${alternativeMessage}`,
          },
        };
      }
      const dailyWindow = await store.incrementRateKey(
        `rate:24h:${rateKey}`,
        24 * 60 * 60,
        20,
      );
      if (!dailyWindow.allowed) {
        return {
          status: 429,
          retryAfter: dailyWindow.retryAfter,
          body: {
            code: "rate_limited",
            message: `Too many recent attempts. ${alternativeMessage}`,
          },
        };
      }

      const candidates = inquiryIdentityCandidates(data, identityKeyring);
      const stored = await store.readInquiry(candidates);
      if (stored?.record.state === "accepted") {
        return acceptedResult(200, "duplicate_accepted", stored.record);
      }

      const requestTime = now();
      if (stored && activeRecordIsOwned(stored, requestTime)) {
        return {
          status: 409,
          retryAfter: 5,
          body: {
            code: "inquiry_processing",
            message: "An identical inquiry is already being processed.",
            inquiryId: stored.record.inquiryId,
          },
        };
      }

      const candidate = candidateForStoredInquiry(stored, candidates);
      if (!candidate) {
        return {
          status: 500,
          body: {
            code: "unexpected_error",
            message: `The inquiry identity could not be confirmed. ${alternativeMessage}`,
          },
        };
      }

      const existingContactId =
        stored?.record.state === "contact_resolved" ||
        stored?.record.state === "business_failed"
          ? stored.record.contactId
          : undefined;
      const reservation = await store.reserveInquiry(
        candidate,
        ownerToken(),
        requestTime,
        INQUIRY_RESERVATION_TTL_SECONDS,
      );
      if (!reservation) {
        return {
          status: 409,
          retryAfter: 5,
          body: {
            code: "inquiry_processing",
            message: "An identical inquiry is already being processed.",
            inquiryId: stored?.record.inquiryId ?? candidate.inquiryId,
          },
        };
      }

      let contactId = existingContactId;
      if (contactId) {
        try {
          await store.recordContact(reservation, contactId, now());
        } catch {
          return {
            status: 500,
            body: {
              code: "unexpected_error",
              message: `The contact state could not be confirmed. ${alternativeMessage}`,
              inquiryId: reservation.inquiryId,
            },
          };
        }
      } else {
        const contactLeaseKey = `contact-lease:${rateDigest(
          data.workEmail,
          undefined,
          identityKeyring.activeSecret,
        )}`;
        const leaseAcquired = await acquireContactLease(
          contactLeaseKey,
          reservation.ownerToken,
        );
        if (!leaseAcquired) {
          await store.recordFailure(reservation, "contact_lease");
          return {
            status: 409,
            retryAfter: 5,
            body: {
              code: "inquiry_processing",
              message: "A contact with this email is already being processed.",
              inquiryId: reservation.inquiryId,
            },
          };
        }

        try {
          const resolved = await resolveContactWithLease(
            data,
            contactLeaseKey,
            reservation.ownerToken,
          );
          contactId = resolved.contactId;
          if (
            !(await store.releaseContactLease(
              contactLeaseKey,
              reservation.ownerToken,
            ))
          ) {
            throw new Error("Contact lease release failed.");
          }
        } catch {
          await store.releaseContactLease(
            contactLeaseKey,
            reservation.ownerToken,
          );
          await store.recordFailure(reservation, "contact_resolution");
          return {
            status: 502,
            body: {
              code: "delivery_failed",
              message: `We couldn't process the inquiry. ${alternativeMessage}`,
              inquiryId: reservation.inquiryId,
            },
          };
        }

        try {
          await store.recordContact(reservation, contactId, now());
        } catch {
          return {
            status: 500,
            body: {
              code: "unexpected_error",
              message: `The contact state could not be confirmed. ${alternativeMessage}`,
              inquiryId: reservation.inquiryId,
            },
          };
        }
      }

      let opportunityId: string;
      try {
        ({ opportunityId } = await gateway.findOrCreateOpportunity({
          inquiryId: reservation.inquiryId,
          contactId,
          data,
        }));
      } catch {
        await store.recordFailure(reservation, "opportunity_resolution");
        return {
          status: 502,
          body: {
            code: "delivery_failed",
            message: `We couldn't process the inquiry. ${alternativeMessage}`,
            inquiryId: reservation.inquiryId,
          },
        };
      }

      const acceptedAt = now();
      try {
        await store.acceptInquiry(
          reservation,
          contactId,
          opportunityId,
          acceptedAt,
        );
      } catch {
        return {
          status: 500,
          body: {
            code: "unexpected_error",
            message: `The inquiry state could not be confirmed. ${alternativeMessage}`,
            inquiryId: reservation.inquiryId,
          },
        };
      }

      return acceptedResult(202, "accepted", {
        state: "accepted",
        inquiryId: reservation.inquiryId,
        keyId: reservation.keyId,
        contactId,
        opportunityId,
        acceptedAt: acceptedAt.toISOString(),
      });
    },
  };
}
