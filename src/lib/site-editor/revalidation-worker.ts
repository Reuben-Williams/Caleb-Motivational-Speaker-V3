import "server-only";

import { randomUUID } from "node:crypto";

import { isAuthorizedWorkerRequest } from "@/lib/inquiries/worker-auth";
import type {
  ClaimedCalebRevalidationJob,
  PostgresRevalidationStore,
} from "./revalidation-store";

const PRIVATE_HEADERS = Object.freeze({ "Cache-Control": "private, no-store" });

interface WorkerStore {
  claimDue(input: {
    workerId: string;
    limit: number;
    leaseSeconds: number;
  }): Promise<readonly ClaimedCalebRevalidationJob[]>;
  complete(input: {
    jobId: string;
    workerId: string;
    succeeded: boolean;
    safeErrorCode?: string;
  }): Promise<boolean>;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

interface WorkerInput {
  resolveStore(): Promise<WorkerStore | PostgresRevalidationStore>;
  refresh(path: string, job: ClaimedCalebRevalidationJob): Promise<void> | void;
  workerId?: () => string;
  simulateCrashAfterRefreshFailure?: boolean;
  reportFailure?: (code: string) => void;
}

// Trusted server-only entry point. Both post-commit kickoff and authenticated cron
// use these same durable claims and leases; neither can refresh an arbitrary input path.
export async function runCalebRevalidationJobs(input: WorkerInput): Promise<
  { claimed: number; completed: number; failed: number } | { code: string }
> {
  let store: WorkerStore;
  try {
    store = await input.resolveStore();
  } catch {
    input.reportFailure?.("revalidation_configuration_invalid");
    return { code: "revalidation_configuration_invalid" };
  }
  const workerId = input.workerId?.() ?? randomUUID();
  let jobs: readonly ClaimedCalebRevalidationJob[];
  try {
    jobs = await store.claimDue({ workerId, limit: 10, leaseSeconds: 120 });
  } catch {
    input.reportFailure?.("revalidation_claim_failed");
    return { code: "revalidation_claim_failed" };
  }
  let completed = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      await input.refresh(job.pagePath, job);
      if (await store.complete({ jobId: job.id, workerId, succeeded: true })) completed += 1;
    } catch (error) {
      if (input.simulateCrashAfterRefreshFailure) throw error;
      failed += 1;
      await store.complete({
        jobId: job.id,
        workerId,
        succeeded: false,
        safeErrorCode: "CONTENT_REFRESH_FAILED",
      });
    }
  }
  return { claimed: jobs.length, completed, failed };
}

export function createCalebRevalidationWorkerHandler(input: WorkerInput & {
  secret(): string | undefined;
}) {
  return async function calebRevalidationWorker(request: Request): Promise<Response> {
    if (request.method !== "GET") return json({ code: "method_not_allowed" }, 405);
    if (!isAuthorizedWorkerRequest(request, input.secret())) {
      return json({ code: "unauthorized" }, 401);
    }
    const url = new URL(request.url);
    if (url.search || request.headers.has("content-length") ||
      request.headers.has("transfer-encoding") || (await request.text()).length > 0) {
      return json({ code: "parameters_not_allowed" }, 400);
    }
    const result = await runCalebRevalidationJobs(input);
    return json(result, "code" in result ? 503 : 200);
  };
}
