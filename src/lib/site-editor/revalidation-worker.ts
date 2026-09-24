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

export function createCalebRevalidationWorkerHandler(input: {
  secret(): string | undefined;
  resolveStore(): Promise<WorkerStore | PostgresRevalidationStore>;
  refresh(path: string): Promise<void> | void;
  workerId?: () => string;
  simulateCrashAfterRefreshFailure?: boolean;
  reportFailure?: (code: string) => void;
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
    let store: WorkerStore;
    try {
      store = await input.resolveStore();
    } catch {
      input.reportFailure?.("revalidation_configuration_invalid");
      return json({ code: "revalidation_configuration_invalid" }, 503);
    }
    const workerId = input.workerId?.() ?? randomUUID();
    let jobs: readonly ClaimedCalebRevalidationJob[];
    try {
      jobs = await store.claimDue({ workerId, limit: 10, leaseSeconds: 120 });
    } catch {
      input.reportFailure?.("revalidation_claim_failed");
      return json({ code: "revalidation_claim_failed" }, 503);
    }
    let completed = 0;
    let failed = 0;
    for (const job of jobs) {
      try {
        await input.refresh(job.pagePath);
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
    return json({ claimed: jobs.length, completed, failed });
  };
}

