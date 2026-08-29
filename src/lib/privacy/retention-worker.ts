type RetentionResult = Readonly<{
  retentionDays: number;
  scheduledCount: number;
  purgedCount: number;
  redactedCount: number;
}>;

type Client = Readonly<{
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{ rows: readonly Record<string, unknown>[]; rowCount: number | null }>>;
  release(): void;
}>;

type Pool = Readonly<{ connect(): Promise<Client> }>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseResult(value: unknown): RetentionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Inquiry retention result was invalid.");
  }
  const result = value as Record<string, unknown>;
  const fields = ["retentionDays", "scheduledCount", "purgedCount", "redactedCount"] as const;
  if (
    result.version !== 1 ||
    fields.some((field) => !Number.isSafeInteger(result[field]) || Number(result[field]) < 0) ||
    Number(result.retentionDays) < 30 ||
    Number(result.retentionDays) > 730
  ) {
    throw new Error("Inquiry retention result was invalid.");
  }
  return Object.freeze({
    retentionDays: Number(result.retentionDays),
    scheduledCount: Number(result.scheduledCount),
    purgedCount: Number(result.purgedCount),
    redactedCount: Number(result.redactedCount),
  });
}

export class PostgresRetentionRepository {
  constructor(private readonly input: Readonly<{ pool: Pool; siteId: string }>) {
    if (!uuid.test(input.siteId)) throw new Error("Retention site ID was invalid.");
  }

  async run(subjectHmacSecret: string): Promise<RetentionResult> {
    if (subjectHmacSecret.length < 32) throw new Error("Retention HMAC secret was invalid.");
    const client = await this.input.pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role builder_retention_worker");
      await client.query("select set_config('builder.site_id',$1,true)", [this.input.siteId]);
      const response = await client.query(
        "select builder_private.builder_run_inquiry_retention_v1($1) as result",
        [subjectHmacSecret],
      );
      const result = parseResult(response.rows[0]?.result);
      await client.query("commit");
      return result;
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        // The original safe failure remains authoritative.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

export function createRetentionWorker(input: Readonly<{
  repository: Readonly<{ run(secret: string): Promise<RetentionResult> }>;
  hmacSecret: string;
}>) {
  return Object.freeze({ run: () => input.repository.run(input.hmacSecret) });
}
