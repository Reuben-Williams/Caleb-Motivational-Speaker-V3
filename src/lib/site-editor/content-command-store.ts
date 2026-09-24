import "server-only";

import { createHash } from "node:crypto";

export type CalebContentOperation =
  | "saveDraft"
  | "publish"
  | "rollback"
  | "undoRollback"
  | "uploadMedia"
  | "retryRevalidation";

export type CalebContentCommandErrorCode =
  | "CONTENT_IDEMPOTENCY_MISMATCH"
  | "CONTENT_RECEIPT_INVALID"
  | "CONTENT_RECEIPT_WRITE_FAILED"
  | "CONTENT_PAYLOAD_INVALID";

export class CalebContentCommandError extends Error {
  constructor(public readonly code: CalebContentCommandErrorCode) {
    super(code);
    this.name = "CalebContentCommandError";
  }
}

interface Queryable {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): PromiseLike<Readonly<{ rows: readonly Row[]; rowCount: number | null }>>;
}

interface ReceiptIdentity {
  siteId: string;
  actorId: string;
  operation: CalebContentOperation;
  idempotencyKey: string;
  payloadDigest: string;
}

export interface CalebContentCommandReplay {
  responseBody: Readonly<Record<string, unknown>>;
  httpStatus: number;
  resultStatus: "applied" | "failed";
  correlationId: string;
  createdAt: string;
  completedAt: string;
}

export interface CalebContentCommandReceipt extends ReceiptIdentity {
  responseBody: Readonly<Record<string, unknown>>;
  httpStatus: number;
  resultStatus: "applied" | "failed";
  correlationId: string;
  completedAt: string;
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  throw new CalebContentCommandError("CONTENT_PAYLOAD_INVALID");
}

export function canonicalContentPayloadDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function timestamp(value: unknown): string {
  const parsed = value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    throw new CalebContentCommandError("CONTENT_RECEIPT_INVALID");
  }
  return parsed.toISOString();
}

function safeResponse(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CalebContentCommandError("CONTENT_RECEIPT_INVALID");
  }
  return Object.freeze(structuredClone(value as Record<string, unknown>));
}

export class ContentCommandStore {
  constructor(private readonly transaction: Queryable) {}

  async lockAndFind(input: ReceiptIdentity): Promise<CalebContentCommandReplay | null> {
    const lockIdentity = [
      input.siteId,
      input.actorId,
      input.operation,
      input.idempotencyKey,
    ].join(":");
    await this.transaction.query(
      "select pg_advisory_xact_lock(hashtextextended($1::text,0)) as locked",
      [lockIdentity],
    );
    const result = await this.transaction.query<{
      payload_digest: unknown;
      response_body: unknown;
      http_status: unknown;
      result_status: unknown;
      correlation_id: unknown;
      created_at: unknown;
      completed_at: unknown;
    }>(
      `select payload_digest,response_body,http_status,result_status,
        correlation_id,created_at,completed_at
       from public.builder_content_command_receipts
       where site_id=$1::uuid and actor_id=$2::uuid and operation=$3
         and idempotency_key=$4`,
      [input.siteId, input.actorId, input.operation, input.idempotencyKey],
    );
    const row = result.rows[0];
    if (!row) return null;
    if (row.payload_digest !== input.payloadDigest) {
      throw new CalebContentCommandError("CONTENT_IDEMPOTENCY_MISMATCH");
    }
    const httpStatus = Number(row.http_status);
    if (
      !Number.isSafeInteger(httpStatus) ||
      httpStatus < 200 ||
      httpStatus > 599 ||
      (row.result_status !== "applied" && row.result_status !== "failed") ||
      typeof row.correlation_id !== "string"
    ) {
      throw new CalebContentCommandError("CONTENT_RECEIPT_INVALID");
    }
    return Object.freeze({
      responseBody: safeResponse(row.response_body),
      httpStatus,
      resultStatus: row.result_status,
      correlationId: row.correlation_id,
      createdAt: timestamp(row.created_at),
      completedAt: timestamp(row.completed_at),
    });
  }

  async record(input: CalebContentCommandReceipt): Promise<void> {
    const result = await this.transaction.query(
      `insert into public.builder_content_command_receipts(
        site_id,actor_id,operation,idempotency_key,payload_digest,response_body,
        http_status,result_status,correlation_id,completed_at
      ) values($1::uuid,$2::uuid,$3,$4,$5,$6::jsonb,$7,$8,$9::uuid,$10::timestamptz)`,
      [
        input.siteId,
        input.actorId,
        input.operation,
        input.idempotencyKey,
        input.payloadDigest,
        JSON.stringify(input.responseBody),
        input.httpStatus,
        input.resultStatus,
        input.correlationId,
        input.completedAt,
      ],
    );
    if (result.rowCount !== 1) {
      throw new CalebContentCommandError("CONTENT_RECEIPT_WRITE_FAILED");
    }
  }
}
