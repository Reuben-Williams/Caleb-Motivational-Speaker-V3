import { createHash } from "node:crypto";

import type { BookingData } from "@/lib/booking-schema";
import {
  renderBusinessEmail,
  renderConfirmationEmail,
} from "@/lib/inquiries/email-renderer";
import { ACCEPTED_INQUIRY_TTL_SECONDS } from "@/lib/inquiries/identity";
import type {
  NativeInquiryAcceptance,
  NativeInquiryGatewayInput,
  NativeInquiryRepository,
  NativeInquiryWrite,
} from "@/lib/inquiries/native-contracts";

const consentLanguage =
  "I agree that the information submitted may be used to evaluate and respond to this speaking inquiry.";
const consentPolicyVersion = "2026-08-29";

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedPhone(value: string): string {
  const digits = value.replaceAll(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return value.trim().startsWith("+") ? `+${digits}` : digits;
}

function publicPayload(data: BookingData): Readonly<Record<string, unknown>> {
  const payload: Record<string, unknown> = { ...data };
  delete payload.turnstileToken;
  return Object.freeze(payload);
}

function leadTitle(data: BookingData): string {
  const event = data.eventType === "other" ? data.eventTypeOther : data.eventType;
  return `${event.replaceAll("-", " ")} — ${data.organization}`;
}

function leadSummary(data: BookingData): Readonly<Record<string, unknown>> {
  return Object.freeze({
    source: "website_form",
    persistedSource: "public_form",
    serviceKey: "speaking-engagement",
    status: "new",
    audienceType: data.audienceType,
    eventType: data.eventType,
    preferredDateStart: data.preferredDateStart,
    preferredDateEnd: data.preferredDateEnd,
    attendanceMode: data.attendanceMode,
    eventLocation: data.eventLocation,
  });
}

export function createNativeInquiryGateway(input: Readonly<{
  repository: NativeInquiryRepository;
  from: string;
  notificationEmail: string;
  replyTo: string;
}>) {
  return Object.freeze({
    async acceptInquiry({
      data,
      candidates,
      receivedAt,
    }: NativeInquiryGatewayInput): Promise<NativeInquiryAcceptance> {
      const active = candidates[0];
      if (!active) throw new Error("Inquiry identity candidates are required.");
      const acceptedAt = receivedAt.toISOString();
      const expiresAt = new Date(
        receivedAt.getTime() + ACCEPTED_INQUIRY_TTL_SECONDS * 1_000,
      ).toISOString();
      const email = data.workEmail.trim().toLowerCase();
      const phone = normalizedPhone(data.phone);
      const confirmation = renderConfirmationEmail(active.inquiryId, data);
      const business = renderBusinessEmail(active.inquiryId, data);
      const write: NativeInquiryWrite = Object.freeze({
        keyId: active.keyId,
        identityDigest: active.digest,
        inquiryId: active.inquiryId,
        idempotencyKey: `inquiry:${active.inquiryId}`,
        candidates: Object.freeze(
          candidates.map(({ keyId, digest: identityDigest }) =>
            Object.freeze({ keyId, digest: identityDigest }),
          ),
        ),
        payload: publicPayload(data),
        organizer: Object.freeze({
          name: data.fullName,
          email,
          emailDigest: digest(email),
          phone,
          phoneDigest: digest(phone),
          organization: data.organization,
        }),
        consent: Object.freeze({
          policyVersion: consentPolicyVersion,
          purpose: "speaking_inquiry" as const,
          languageDigest: digest(consentLanguage),
          capturedAt: acceptedAt,
        }),
        receivedAt: acceptedAt,
        expiresAt,
        leadTitle: leadTitle(data),
        leadSummary: leadSummary(data),
        messages: Object.freeze([
          Object.freeze({
            messageKind: "organizer_acknowledgement" as const,
            recipientKind: "organizer" as const,
            destination: email,
            sender: input.from,
            replyTo: input.replyTo,
            subject: confirmation.subject,
            bodyText: confirmation.text,
            idempotencyKey: `inquiry:${active.inquiryId}:organizer`,
          }),
          Object.freeze({
            messageKind: "internal_notification" as const,
            recipientKind: "internal" as const,
            destination: input.notificationEmail.trim().toLowerCase(),
            sender: input.from,
            replyTo: email,
            subject: business.subject,
            bodyText: business.text,
            idempotencyKey: `inquiry:${active.inquiryId}:internal`,
          }),
        ]),
      });
      return input.repository.accept(write);
    },
  });
}
