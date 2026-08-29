import type {
  NativeInquiryAcceptance,
  NativeInquiryWrite,
} from "@/lib/inquiries/native-contracts";

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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const inquiryPattern = /^CJ-[A-F0-9]{12}$/;

function parseAcceptance(value: unknown): NativeInquiryAcceptance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Native inquiry result was invalid.");
  }
  const result = value as Record<string, unknown>;
  if (
    (result.status !== "accepted" && result.status !== "duplicate_accepted") ||
    typeof result.inquiryId !== "string" ||
    !inquiryPattern.test(result.inquiryId) ||
    typeof result.acceptedAt !== "string" ||
    Number.isNaN(Date.parse(result.acceptedAt)) ||
    typeof result.submissionId !== "string" ||
    !uuidPattern.test(result.submissionId)
  ) {
    throw new Error("Native inquiry result was invalid.");
  }
  if (result.status === "duplicate_accepted") {
    return Object.freeze({
      status: result.status,
      inquiryId: result.inquiryId,
      acceptedAt: result.acceptedAt,
      submissionId: result.submissionId,
    });
  }
  if (
    typeof result.contactId !== "string" ||
    !uuidPattern.test(result.contactId) ||
    typeof result.leadId !== "string" ||
    !uuidPattern.test(result.leadId)
  ) {
    throw new Error("Native inquiry result was invalid.");
  }
  return Object.freeze({
    status: result.status,
    inquiryId: result.inquiryId,
    acceptedAt: result.acceptedAt,
    submissionId: result.submissionId,
    contactId: result.contactId,
    leadId: result.leadId,
  });
}

export class PostgresInquiryRepository {
  constructor(
    private readonly input: Readonly<{
      database: Database;
      session: TrustedSession;
    }>,
  ) {}

  async accept(write: NativeInquiryWrite): Promise<NativeInquiryAcceptance> {
    return this.input.database.withSession(
      this.input.session,
      async (transaction) => {
        const response = await transaction.query<{ result: unknown }>(
          "select builder_private.builder_runtime_accept_speaking_inquiry_v1($1::jsonb) as result",
          [JSON.stringify(write)],
        );
        return parseAcceptance(response.rows[0]?.result);
      },
      { retrySafe: true, maximumAttempts: 3 },
    );
  }
}
