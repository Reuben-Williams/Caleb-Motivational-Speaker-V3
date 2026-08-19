import { randomUUID } from "node:crypto";

import { z } from "zod";

export const CONTACT_LEASE_ACQUIRE_BUDGET_MS = 5_000;
export const CONTACT_LEASE_TTL_SECONDS = 90;
export const CONTACT_LEASE_RENEW_INTERVAL_MS = 30_000;
export const CONTACT_RESOLUTION_BUDGET_MS = 75_000;

const common = {
  inquiryId: z.string().min(1),
  keyId: z.string().min(1),
} as const;

const owned = {
  ownerToken: z.string().min(1),
  leaseExpiresAt: z.string().datetime(),
} as const;

const inquiryRecordSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("processing"),
    ...common,
    ...owned,
  }),
  z.object({
    state: z.literal("contact_resolved"),
    ...common,
    ...owned,
    contactId: z.string().min(1),
  }),
  z.object({
    state: z.literal("business_failed"),
    ...common,
    contactId: z.string().min(1).optional(),
    failedOperation: z.string().min(1),
  }),
  z.object({
    state: z.literal("accepted"),
    ...common,
    contactId: z.string().min(1),
    opportunityId: z.string().min(1),
    acceptedAt: z.string().datetime(),
  }),
]);

export type InquiryRecord = z.infer<typeof inquiryRecordSchema>;

export function parseInquiryRecord(input: unknown): InquiryRecord {
  return inquiryRecordSchema.parse(input);
}

export function createLeaseOwnerToken(): string {
  return randomUUID();
}
