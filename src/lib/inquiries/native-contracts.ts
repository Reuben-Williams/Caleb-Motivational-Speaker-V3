import type { BookingData } from "@/lib/booking-schema";

export type NativeInquiryCandidate = Readonly<{
  keyId: string;
  digest: string;
}>;

export type NativeInquiryMessage = Readonly<{
  messageKind: "organizer_acknowledgement" | "internal_notification";
  recipientKind: "organizer" | "internal";
  destination: string;
  sender: string;
  replyTo: string;
  subject: string;
  bodyText: string;
  idempotencyKey: string;
}>;

export type NativeInquiryWrite = Readonly<{
  keyId: string;
  identityDigest: string;
  inquiryId: string;
  idempotencyKey: string;
  candidates: readonly NativeInquiryCandidate[];
  payload: Readonly<Record<string, unknown>>;
  organizer: Readonly<{
    name: string;
    email: string;
    emailDigest: string;
    phone: string;
    phoneDigest: string;
    organization: string;
  }>;
  consent: Readonly<{
    policyVersion: string;
    purpose: "speaking_inquiry";
    languageDigest: string;
    capturedAt: string;
  }>;
  receivedAt: string;
  expiresAt: string;
  leadTitle: string;
  leadSummary: Readonly<Record<string, unknown>>;
  messages: readonly NativeInquiryMessage[];
}>;

export type NativeInquiryAcceptance =
  | Readonly<{
      status: "accepted";
      inquiryId: string;
      acceptedAt: string;
      submissionId: string;
      contactId: string;
      leadId: string;
    }>
  | Readonly<{
      status: "duplicate_accepted";
      inquiryId: string;
      acceptedAt: string;
      submissionId: string;
    }>;

export interface NativeInquiryRepository {
  accept(write: NativeInquiryWrite): Promise<NativeInquiryAcceptance>;
}

export type NativeInquiryGatewayInput = Readonly<{
  data: BookingData;
  candidates: readonly Readonly<{
    keyId: string;
    digest: string;
    inquiryId: string;
  }>[];
  receivedAt: Date;
}>;
