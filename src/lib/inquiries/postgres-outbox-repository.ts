import type {
  InquiryOutboxClaim,
  InquiryOutboxCompletion,
  InquiryOutboxRepository,
} from "@/lib/inquiries/outbox-worker";

type TrustedSession = Readonly<{
  siteId: string;
  memberId: string;
  capabilities: readonly string[];
}>;

type Transaction = TrustedSession & {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{ rows: readonly Row[]; rowCount: number | null }>>;
};

type Database = {
  withSession<Result>(
    session: TrustedSession,
    operation: (transaction: Transaction) => Promise<Result>,
    options?: Readonly<{ retrySafe?: boolean; maximumAttempts?: number }>,
  ): Promise<Result>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Inquiry outbox claim contract was invalid.");
  }
  return value;
}

function parseClaim(value: unknown): InquiryOutboxClaim {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Inquiry outbox claim contract was invalid.");
  }
  const record = value as Record<string, unknown>;
  const outboxId = text(record, "outboxId");
  const submissionId = text(record, "submissionId");
  const leaseToken = text(record, "leaseToken");
  const messageKind = record.messageKind;
  const recipientKind = record.recipientKind;
  if (
    !uuid.test(outboxId) ||
    !uuid.test(submissionId) ||
    !uuid.test(leaseToken) ||
    (messageKind !== "organizer_acknowledgement" &&
      messageKind !== "internal_notification") ||
    (recipientKind !== "organizer" && recipientKind !== "internal") ||
    !Number.isSafeInteger(record.attempt) ||
    Number(record.attempt) < 1
  ) {
    throw new Error("Inquiry outbox claim contract was invalid.");
  }
  const leaseExpiresAt = text(record, "leaseExpiresAt");
  if (Number.isNaN(Date.parse(leaseExpiresAt))) {
    throw new Error("Inquiry outbox claim contract was invalid.");
  }
  return Object.freeze({
    outboxId,
    submissionId,
    messageKind,
    recipientKind,
    destination: text(record, "destination"),
    sender: text(record, "sender"),
    replyTo: text(record, "replyTo"),
    subject: text(record, "subject"),
    bodyText: text(record, "bodyText"),
    idempotencyKey: text(record, "idempotencyKey"),
    attempt: Number(record.attempt),
    leaseToken,
    leaseExpiresAt,
  });
}

function parseClaims(value: unknown): readonly InquiryOutboxClaim[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Inquiry outbox claim contract was invalid.");
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.claims)) {
    throw new Error("Inquiry outbox claim contract was invalid.");
  }
  return Object.freeze(record.claims.map(parseClaim));
}

export class PostgresInquiryOutboxRepository implements InquiryOutboxRepository {
  constructor(
    private readonly input: Readonly<{
      database: Database;
      session: TrustedSession;
    }>,
  ) {}

  async claim(workerId: string, limit: number) {
    return this.input.database.withSession(
      this.input.session,
      async (transaction) => {
        const response = await transaction.query<{ result: unknown }>(
          "select builder_private.builder_claim_inquiry_outbox_v1($1,$2) as result",
          [workerId, limit],
        );
        return parseClaims(response.rows[0]?.result);
      },
      { retrySafe: true, maximumAttempts: 3 },
    );
  }

  async complete(result: InquiryOutboxCompletion): Promise<void> {
    await this.input.database.withSession(this.input.session, async (transaction) => {
      await transaction.query(
        "select builder_private.builder_complete_inquiry_outbox_v1($1::jsonb) as result",
        [JSON.stringify(result)],
      );
    });
  }
}
