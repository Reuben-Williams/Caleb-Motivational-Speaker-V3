import { describe, expect, it, vi } from "vitest";

import { PostgresInquiryRepository } from "@/lib/inquiries/postgres-inquiry-repository";
import type { NativeInquiryWrite } from "@/lib/inquiries/native-contracts";

const session = {
  siteId: "c1000000-0000-4000-8000-000000000001",
  memberId: "c1000000-0000-4000-8000-000000000010",
  capabilities: ["submissions.create", "leads.create", "messages.queue"],
} as const;

const write: NativeInquiryWrite = {
  keyId: "v2",
  identityDigest: "a".repeat(64),
  inquiryId: "CJ-AAAAAAAAAAAA",
  idempotencyKey: "inquiry:CJ-AAAAAAAAAAAA",
  candidates: [
    { keyId: "v2", digest: "a".repeat(64) },
    { keyId: "v1", digest: "b".repeat(64) },
  ],
  payload: { eventType: "keynote" },
  organizer: {
    name: "Jordan Avery",
    email: "jordan@example.org",
    emailDigest: "c".repeat(64),
    phone: "+14045550199",
    phoneDigest: "d".repeat(64),
    organization: "North Star College",
  },
  consent: {
    policyVersion: "2026-08-29",
    purpose: "speaking_inquiry",
    languageDigest: "e".repeat(64),
    capturedAt: "2026-08-29T12:00:00.000Z",
  },
  receivedAt: "2026-08-29T12:00:00.000Z",
  expiresAt: "2027-10-03T12:00:00.000Z",
  leadTitle: "Keynote — North Star College",
  leadSummary: { serviceKey: "speaking-engagement" },
  messages: [],
};

describe("PostgresInquiryRepository", () => {
  it("runs the native acceptance function in one retry-safe trusted session", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          result: {
            status: "accepted",
            inquiryId: "CJ-AAAAAAAAAAAA",
            acceptedAt: "2026-08-29T12:00:00.000Z",
            submissionId: "c1000000-0000-4000-8000-000000000020",
            contactId: "c1000000-0000-4000-8000-000000000021",
            leadId: "c1000000-0000-4000-8000-000000000022",
          },
        },
      ],
      rowCount: 1,
    });
    const withSession = vi.fn(async (_session, operation, options) => {
      expect(_session).toEqual(session);
      expect(options).toEqual({ retrySafe: true, maximumAttempts: 3 });
      return operation({ ...session, query });
    });
    const repository = new PostgresInquiryRepository({
      database: { withSession },
      session,
    });

    const result = await repository.accept(write);

    expect(query).toHaveBeenCalledWith(
      "select builder_private.builder_runtime_accept_speaking_inquiry_v1($1::jsonb) as result",
      [JSON.stringify(write)],
    );
    expect(result).toMatchObject({
      status: "accepted",
      inquiryId: "CJ-AAAAAAAAAAAA",
      leadId: "c1000000-0000-4000-8000-000000000022",
    });
  });

  it("rejects an incomplete or provider-leaking database result", async () => {
    const repository = new PostgresInquiryRepository({
      database: {
        withSession: async (_session, operation) =>
          operation({
            ...session,
            query: async <Row extends Record<string, unknown>>() => ({
              rows: [
                {
                  result: {
                    status: "accepted",
                    providerReference: "secret",
                  },
                } as unknown as Row,
              ],
              rowCount: 1,
            }),
          }),
      },
      session,
    });

    await expect(repository.accept(write)).rejects.toThrow(
      "Native inquiry result was invalid.",
    );
  });
});
