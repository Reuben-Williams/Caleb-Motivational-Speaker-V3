import { createHmac } from "node:crypto";

import type { BookingData } from "@/lib/booking-schema";

export function canonicalInquiry(data: BookingData): string {
  return JSON.stringify({
    fullName: data.fullName,
    workEmail: data.workEmail.toLowerCase(),
    phone: data.phone,
    organization: data.organization,
    roleTitle: data.roleTitle,
    audienceType: data.audienceType,
    audienceTypeOther: data.audienceTypeOther,
    eventType: data.eventType,
    eventTypeOther: data.eventTypeOther,
    preferredDateStart: data.preferredDateStart,
    preferredDateEnd: data.preferredDateEnd,
    estimatedAudienceSize: data.estimatedAudienceSize,
    eventLocation: data.eventLocation,
    attendanceMode: data.attendanceMode,
    programLength: data.programLength,
    eventGoals: data.eventGoals,
    budgetRange: data.budgetRange,
    referralSource: data.referralSource,
    referralSourceOther: data.referralSourceOther,
    additionalDetails: data.additionalDetails,
    consent: data.consent,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
    utmTerm: data.utmTerm,
    utmContent: data.utmContent,
    referrerPath: data.referrerPath,
  });
}

export function inquiryDigest(data: BookingData, secret: string): string {
  return createHmac("sha256", secret)
    .update(canonicalInquiry(data))
    .digest("hex");
}

export function rateDigest(
  email: string,
  trustedClientIp: string | undefined,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${email.trim().toLowerCase()}|${trustedClientIp ?? ""}`)
    .digest("hex");
}

