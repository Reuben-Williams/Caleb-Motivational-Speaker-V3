import { isIP } from "node:net";

import { ResendInquiryDelivery } from "@/lib/inquiries/resend-delivery";
import { createInquiryService } from "@/lib/inquiries/service";
import { TurnstileVerifier } from "@/lib/inquiries/turnstile-verifier";
import { UpstashInquiryStore } from "@/lib/inquiries/upstash-store";

type InquiryEnvironment = Record<string, string | undefined>;

const requiredKeys = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "INQUIRY_NOTIFICATION_EMAIL",
  "TURNSTILE_SECRET_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "INQUIRY_HMAC_SECRET",
] as const;

export function createInquiryRuntime(environment: InquiryEnvironment) {
  if (requiredKeys.some((key) => !environment[key]?.trim())) {
    return null;
  }

  const store = new UpstashInquiryStore(
    environment.UPSTASH_REDIS_REST_URL!,
    environment.UPSTASH_REDIS_REST_TOKEN!,
  );
  const delivery = new ResendInquiryDelivery(
    environment.RESEND_API_KEY!,
    environment.RESEND_FROM_EMAIL!,
    environment.INQUIRY_NOTIFICATION_EMAIL!,
  );
  const spam = new TurnstileVerifier(environment.TURNSTILE_SECRET_KEY!);

  return createInquiryService({
    hmacSecret: environment.INQUIRY_HMAC_SECRET!,
    store,
    delivery,
    spam,
  });
}

export function trustedClientIpFromRequest(
  request: Request,
  trustedHeader: string | undefined,
) {
  if (!trustedHeader?.trim()) return undefined;
  const raw = request.headers.get(trustedHeader.trim());
  if (!raw) return undefined;
  const candidate = raw.split(",")[0]?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : undefined;
}
