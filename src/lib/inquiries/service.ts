import {
  bookingSchema,
  type BookingData,
  type BookingInput,
} from "@/lib/booking-schema";
import { inquiryDigest, rateDigest } from "@/lib/inquiries/canonical";

export type InquiryRecord = {
  inquiryId: string;
  state: "processing" | "accepted" | "business_failed";
  confirmationEmailSent: boolean;
};

export interface InquiryStore {
  incrementRateKey(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; retryAfter: number }>;
  reserveInquiry(
    key: string,
    inquiryId: string,
    ttlSeconds: number,
  ): Promise<boolean>;
  readInquiry(key: string): Promise<InquiryRecord | null>;
  markBusinessDelivered(key: string): Promise<void>;
  markBusinessFailed(key: string): Promise<void>;
  acquireConfirmationRetry(key: string, ttlSeconds: number): Promise<boolean>;
  markConfirmationSent(key: string): Promise<void>;
}

export interface SpamVerifier {
  verify(token: string, trustedClientIp?: string): Promise<boolean>;
}

export type DeliveryMessage = {
  inquiryId: string;
  data: BookingData;
  idempotencyKey: string;
};

export interface InquiryDelivery {
  sendBusiness(message: DeliveryMessage): Promise<void>;
  sendConfirmation(message: DeliveryMessage): Promise<void>;
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
  confirmationEmailSent?: boolean;
  fieldErrors?: Record<string, string[]>;
  correlationId?: string;
};

export type InquiryResult = {
  status: 200 | 202 | 400 | 409 | 429 | 500 | 502 | 503;
  body: ServiceBody;
  retryAfter?: number;
};

type InquiryServiceDependencies = {
  hmacSecret: string;
  store: InquiryStore;
  delivery: InquiryDelivery;
  spam: SpamVerifier;
};

const acceptedMessage =
  "Your speaking inquiry was received. Keep the inquiry ID for your records.";
const alternativeMessage =
  "Please try again, call (404) 941-5670, or email info@calebjakes.com.";

function acceptedResult(
  status: 200 | 202,
  code: "accepted" | "duplicate_accepted",
  record: InquiryRecord,
): InquiryResult {
  return {
    status,
    body: {
      code,
      message: acceptedMessage,
      inquiryId: record.inquiryId,
      confirmationEmailSent: record.confirmationEmailSent,
    },
  };
}

export function createInquiryService({
  hmacSecret,
  store,
  delivery,
  spam,
}: InquiryServiceDependencies) {
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
        hmacSecret,
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

      const digest = inquiryDigest(data, hmacSecret);
      const key = `inquiry:${digest}`;
      const inquiryId = `CJ-${digest.slice(0, 12).toUpperCase()}`;
      const businessIdempotencyKey = `business-inquiry/${digest.slice(0, 48)}`;
      const confirmationIdempotencyKey =
        `organizer-confirmation/${digest.slice(0, 48)}`;

      const existing = await store.readInquiry(key);
      if (existing?.state === "accepted") {
        let accepted = existing;
        if (
          !existing.confirmationEmailSent &&
          (await store.acquireConfirmationRetry(key, 5 * 60))
        ) {
          try {
            await delivery.sendConfirmation({
              inquiryId,
              data,
              idempotencyKey: confirmationIdempotencyKey,
            });
            await store.markConfirmationSent(key);
            accepted = {
              ...existing,
              confirmationEmailSent: true,
            };
          } catch {
            // The accepted inquiry remains valid even if confirmation fails.
          }
        }
        return acceptedResult(200, "duplicate_accepted", accepted);
      }
      if (existing?.state === "processing") {
        return {
          status: 409,
          retryAfter: 5,
          body: {
            code: "inquiry_processing",
            message: "An identical inquiry is already being processed.",
            inquiryId: existing.inquiryId,
          },
        };
      }

      const reserved = await store.reserveInquiry(key, inquiryId, 15 * 60);
      if (!reserved) {
        return {
          status: 409,
          retryAfter: 5,
          body: {
            code: "inquiry_processing",
            message: "An identical inquiry is already being processed.",
            inquiryId,
          },
        };
      }

      try {
        await delivery.sendBusiness({
          inquiryId,
          data,
          idempotencyKey: businessIdempotencyKey,
        });
      } catch {
        await store.markBusinessFailed(key);
        return {
          status: 502,
          body: {
            code: "delivery_failed",
            message: `We couldn't deliver the inquiry. ${alternativeMessage}`,
            inquiryId,
          },
        };
      }

      try {
        await store.markBusinessDelivered(key);
      } catch {
        return {
          status: 500,
          body: {
            code: "unexpected_error",
            message: `The delivery state could not be confirmed. ${alternativeMessage}`,
            inquiryId,
          },
        };
      }

      let confirmationEmailSent = false;
      try {
        await delivery.sendConfirmation({
          inquiryId,
          data,
          idempotencyKey: confirmationIdempotencyKey,
        });
        await store.markConfirmationSent(key);
        confirmationEmailSent = true;
      } catch {
        // Business delivery is the success boundary.
      }

      return acceptedResult(202, "accepted", {
        inquiryId,
        state: "accepted",
        confirmationEmailSent,
      });
    },
  };
}

