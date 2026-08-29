import {
  bookingSchema,
  type BookingInput,
} from "@/lib/booking-schema";
import { rateDigest } from "@/lib/inquiries/canonical";
import {
  inquiryIdentityCandidates,
  type InquiryIdentityKeyring,
} from "@/lib/inquiries/identity";
import type {
  NativeInquiryAcceptance,
  NativeInquiryGatewayInput,
} from "@/lib/inquiries/native-contracts";

export interface NativeSpamVerifier {
  verify(token: string, trustedClientIp?: string): Promise<boolean>;
}

export interface InquiryCoordination {
  incrementRateKey(
    key: string,
    ttlSeconds: number,
    limit: number,
  ): Promise<Readonly<{ allowed: boolean; retryAfter: number }>>;
  acquireProcessingLease(
    key: string,
    owner: string,
    ttlSeconds: number,
  ): Promise<boolean>;
  releaseProcessingLease(key: string, owner: string): Promise<boolean>;
}

export interface AtomicInquiryGateway {
  acceptInquiry(input: NativeInquiryGatewayInput): Promise<NativeInquiryAcceptance>;
}

type ServiceBody = {
  code:
    | "accepted"
    | "duplicate_accepted"
    | "validation_failed"
    | "spam_failed"
    | "rate_limited"
    | "inquiry_processing"
    | "service_unavailable"
    | "unexpected_error";
  message: string;
  inquiryId?: string;
  acceptedAt?: string;
  fieldErrors?: Record<string, string[]>;
};

export type NativeInquiryResult = Readonly<{
  status: 200 | 202 | 400 | 409 | 429 | 500 | 503;
  body: ServiceBody;
  retryAfter?: number;
}>;

const processingLeaseSeconds = 120;
const acceptedMessage =
  "Your speaking inquiry was received. Keep the inquiry ID for your records.";
const alternatives =
  "Please try again, call (404) 941-5670, or email info@calebjakes.com.";

function unavailable(): NativeInquiryResult {
  return {
    status: 503,
    body: {
      code: "service_unavailable",
      message: `The inquiry service is temporarily unavailable. ${alternatives}`,
    },
  };
}

function receipt(acceptance: NativeInquiryAcceptance): NativeInquiryResult {
  return {
    status: acceptance.status === "accepted" ? 202 : 200,
    body: {
      code: acceptance.status,
      message: acceptedMessage,
      inquiryId: acceptance.inquiryId,
      acceptedAt: acceptance.acceptedAt,
    },
  };
}

export function createNativeInquiryService(input: Readonly<{
  identityKeyring: InquiryIdentityKeyring;
  spam: NativeSpamVerifier;
  coordination: InquiryCoordination;
  gateway: AtomicInquiryGateway;
  now?: () => Date;
  ownerToken?: () => string;
}>) {
  const now = input.now ?? (() => new Date());
  const ownerToken =
    input.ownerToken ?? (() => crypto.randomUUID().replaceAll("-", ""));

  return Object.freeze({
    async submit(
      raw: BookingInput,
      context: Readonly<{ trustedClientIp?: string }>,
    ): Promise<NativeInquiryResult> {
      const parsed = bookingSchema.safeParse(raw);
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
      if (!(await input.spam.verify(data.turnstileToken, context.trustedClientIp))) {
        return {
          status: 400,
          body: {
            code: "spam_failed",
            message: `We couldn't verify this request. ${alternatives}`,
          },
        };
      }

      const rateKey = rateDigest(
        data.workEmail,
        context.trustedClientIp,
        input.identityKeyring.activeSecret,
      );
      try {
        for (const window of [
          { prefix: "15m", ttl: 15 * 60, limit: 5 },
          { prefix: "24h", ttl: 24 * 60 * 60, limit: 20 },
        ]) {
          const result = await input.coordination.incrementRateKey(
            `rate:${window.prefix}:${rateKey}`,
            window.ttl,
            window.limit,
          );
          if (!result.allowed) {
            return {
              status: 429,
              retryAfter: result.retryAfter,
              body: {
                code: "rate_limited",
                message: `Too many recent attempts. ${alternatives}`,
              },
            };
          }
        }
      } catch {
        return unavailable();
      }

      const candidates = inquiryIdentityCandidates(data, input.identityKeyring);
      const active = candidates[0];
      if (!active) {
        return {
          status: 500,
          body: {
            code: "unexpected_error",
            message: `The inquiry identity could not be confirmed. ${alternatives}`,
          },
        };
      }
      const leaseKey = `processing:${active.ledgerKey}`;
      const owner = ownerToken();
      try {
        if (
          !(await input.coordination.acquireProcessingLease(
            leaseKey,
            owner,
            processingLeaseSeconds,
          ))
        ) {
          return {
            status: 409,
            retryAfter: 5,
            body: {
              code: "inquiry_processing",
              message: "An identical inquiry is already being processed.",
              inquiryId: active.inquiryId,
            },
          };
        }
      } catch {
        return unavailable();
      }

      try {
        return receipt(
          await input.gateway.acceptInquiry({
            data,
            candidates,
            receivedAt: now(),
          }),
        );
      } catch {
        return unavailable();
      } finally {
        try {
          await input.coordination.releaseProcessingLease(leaseKey, owner);
        } catch {
          // Neon is authoritative after commit; lease expiry safely recovers.
        }
      }
    },
  });
}
