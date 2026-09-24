import "server-only";

import type {
  DataPlaneDatabase,
  DataPlaneSession,
  DataPlaneTransaction,
} from "@reuben-williams/next/database";

export type CalebPublicContentOperation = "publish" | "rollback" | "undoRollback";
export type CalebRevalidationStatus = "pending" | "complete" | "failed";

export interface ClaimedCalebRevalidationJob {
  id: string;
  pagePath: string;
  publishedVersionId: string;
  operation: CalebPublicContentOperation;
  attemptCount: number;
  maxAttempts: number;
  correlationId: string;
  leaseExpiresAt: string;
}

interface EnqueueInput {
  siteId: string;
  pagePath: string;
  publishedVersionId: string;
  operation: CalebPublicContentOperation;
  correlationId: string;
}

export async function enqueueContentRevalidation(
  transaction: DataPlaneTransaction,
  input: EnqueueInput,
): Promise<void> {
  const result = await transaction.query(
    `insert into public.builder_content_revalidation_jobs(
      site_id,page_path,published_version_id,operation,correlation_id
    ) values($1::uuid,$2,$3::uuid,$4,$5::uuid)`,
    [
      input.siteId,
      input.pagePath,
      input.publishedVersionId,
      input.operation,
      input.correlationId,
    ],
  );
  if (result.rowCount !== 1) throw new Error("revalidation_enqueue_failed");
}

function isClaimedJob(value: unknown): value is ClaimedCalebRevalidationJob {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const job = value as Record<string, unknown>;
  return (
    typeof job.id === "string" &&
    typeof job.pagePath === "string" &&
    typeof job.publishedVersionId === "string" &&
    ["publish", "rollback", "undoRollback"].includes(String(job.operation)) &&
    Number.isSafeInteger(job.attemptCount) &&
    Number.isSafeInteger(job.maxAttempts) &&
    typeof job.correlationId === "string" &&
    typeof job.leaseExpiresAt === "string" &&
    !Number.isNaN(Date.parse(job.leaseExpiresAt))
  );
}

export class PostgresRevalidationStore {
  constructor(private readonly input: Readonly<{
    database: DataPlaneDatabase;
    session: DataPlaneSession;
  }>) {}

  private run<Result>(
    role: "builder_content_runtime" | "builder_revalidation_worker",
    operation: (transaction: DataPlaneTransaction) => Promise<Result>,
  ): Promise<Result> {
    return this.input.database.withSession(this.input.session, async (transaction) => {
      await transaction.query(`set local role ${role}`);
      return operation(transaction);
    });
  }

  async status(correlationId: string): Promise<CalebRevalidationStatus | null> {
    return this.run("builder_content_runtime", async (transaction) => {
      const result = await transaction.query<{ status: unknown }>(
        `select job.status
         from public.builder_content_revalidation_jobs job
         join public.builder_content_command_receipts receipt
           on receipt.site_id=job.site_id and receipt.correlation_id=job.correlation_id
         where job.site_id=$1::uuid and receipt.actor_id=$2::uuid
           and job.correlation_id=$3::uuid`,
        [this.input.session.siteId, this.input.session.memberId, correlationId],
      );
      const stored = result.rows[0]?.status;
      if (stored === undefined) return null;
      if (stored === "pending" || stored === "processing") return "pending";
      if (stored === "completed") return "complete";
      if (stored === "failed") return "failed";
      throw new Error("revalidation_status_invalid");
    });
  }

  async claimDue(input: Readonly<{
    workerId: string;
    limit: number;
    leaseSeconds: number;
  }>): Promise<readonly ClaimedCalebRevalidationJob[]> {
    return this.run("builder_revalidation_worker", async (transaction) => {
      const result = await transaction.query<{ jobs: unknown }>(
        `select builder_private.builder_claim_content_revalidation_jobs_v1(
          $1::uuid,$2::uuid,$3::integer,$4::integer
        ) as jobs`,
        [this.input.session.siteId, input.workerId, input.limit, input.leaseSeconds],
      );
      const jobs = result.rows[0]?.jobs;
      if (!Array.isArray(jobs) || !jobs.every(isClaimedJob)) {
        throw new Error("revalidation_claim_invalid");
      }
      return Object.freeze(jobs.map((job) => Object.freeze({ ...job })));
    });
  }

  async complete(input: Readonly<{
    jobId: string;
    workerId: string;
    succeeded: boolean;
    safeErrorCode?: string;
  }>): Promise<boolean> {
    if (
      !input.succeeded &&
      (!input.safeErrorCode || !/^[A-Z][A-Z0-9_]{0,63}$/.test(input.safeErrorCode))
    ) {
      throw new Error("revalidation_error_code_invalid");
    }
    return this.run("builder_revalidation_worker", async (transaction) => {
      const result = await transaction.query<{ applied: unknown }>(
        `select builder_private.builder_complete_content_revalidation_job_v1(
          $1::uuid,$2::uuid,$3::uuid,$4::boolean,$5::text
        ) as applied`,
        [
          this.input.session.siteId,
          input.jobId,
          input.workerId,
          input.succeeded,
          input.succeeded ? null : input.safeErrorCode,
        ],
      );
      if (typeof result.rows[0]?.applied !== "boolean") {
        throw new Error("revalidation_completion_invalid");
      }
      return result.rows[0].applied;
    });
  }

  async retryFailed(correlationId: string): Promise<boolean> {
    return this.run("builder_content_runtime", async (transaction) => {
      const result = await transaction.query<{ applied: unknown }>(
        `select builder_private.builder_retry_content_revalidation_job_v1(
          $1::uuid,$2::uuid
        ) as applied`,
        [this.input.session.siteId, correlationId],
      );
      if (typeof result.rows[0]?.applied !== "boolean") {
        throw new Error("revalidation_retry_invalid");
      }
      return result.rows[0].applied;
    });
  }
}
