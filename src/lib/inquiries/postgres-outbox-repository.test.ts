import { describe, expect, it, vi } from "vitest";

import { PostgresInquiryOutboxRepository } from "@/lib/inquiries/postgres-outbox-repository";

const session = {
  siteId: "11111111-1111-4111-8111-111111111111",
  memberId: "22222222-2222-4222-8222-222222222222",
  capabilities: ["messaging.deliver"],
};

describe("Postgres inquiry outbox repository", () => {
  it("parses only the fenced versioned claim contract", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          result: {
            version: 1,
            claims: [
              {
                outboxId: "33333333-3333-4333-8333-333333333333",
                submissionId: "44444444-4444-4444-8444-444444444444",
                messageKind: "organizer_acknowledgement",
                recipientKind: "organizer",
                destination: "organizer@example.com",
                sender: "Caleb Jakes <bookings@mail.calebjakes.com>",
                replyTo: "info@calebjakes.com",
                subject: "Received",
                bodyText: "Thanks",
                idempotencyKey: "inquiry:CJ-ABCDEF123456:organizer",
                attempt: 1,
                leaseToken: "55555555-5555-4555-8555-555555555555",
                leaseExpiresAt: "2026-08-29T12:01:00.000Z",
              },
            ],
          },
        },
      ],
      rowCount: 1,
    });
    const database = {
      withSession: vi.fn(async (_session, operation) => operation({ ...session, query })),
    };
    const repository = new PostgresInquiryOutboxRepository({ database, session });

    await expect(repository.claim("worker-a", 20)).resolves.toHaveLength(1);
    expect(query).toHaveBeenCalledWith(
      "select builder_private.builder_claim_inquiry_outbox_v1($1,$2) as result",
      ["worker-a", 20],
    );
  });

  it("completes with the exact fenced result object", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ result: { version: 1, status: "delivered" } }],
      rowCount: 1,
    });
    const database = {
      withSession: vi.fn(async (_session, operation) => operation({ ...session, query })),
    };
    const repository = new PostgresInquiryOutboxRepository({ database, session });
    const completion = {
      outboxId: "33333333-3333-4333-8333-333333333333",
      leaseToken: "55555555-5555-4555-8555-555555555555",
      outcome: "delivered" as const,
      providerReference: "email_123",
      providerReferenceDigest: "a".repeat(64),
    };

    await repository.complete(completion);

    expect(query).toHaveBeenCalledWith(
      "select builder_private.builder_complete_inquiry_outbox_v1($1::jsonb) as result",
      [JSON.stringify(completion)],
    );
  });

  it("rejects provider-shaped or incomplete claim payloads", async () => {
    const database = {
      withSession: vi.fn(async (_session, operation) =>
        operation({
          ...session,
          query: vi.fn().mockResolvedValue({
            rows: [{ result: { version: 1, claims: [{ provider: "resend" }] } }],
            rowCount: 1,
          }),
        }),
      ),
    };
    const repository = new PostgresInquiryOutboxRepository({ database, session });

    await expect(repository.claim("worker-a", 20)).rejects.toThrow(
      "claim contract",
    );
  });
});
