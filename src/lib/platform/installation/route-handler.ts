import "server-only";

import { isAuthorizedWorkerRequest } from "@/lib/inquiries/worker-auth";

interface InstallationRuntime {
  runScheduled(options?: { signal?: AbortSignal }): Promise<{
    pulled: number;
    acknowledged: number;
    healthReported: boolean;
  }>;
}

const HEADERS = { "Cache-Control": "private, no-store" };

function json(code: string, status: number, facts: Record<string, unknown> = {}): Response {
  return Response.json({ code, ...facts }, { status, headers: HEADERS });
}

export function createCalebInstallationWorkerHandler(input: {
  secret: () => string | undefined;
  resolveRuntime: () => Promise<InstallationRuntime>;
  timeoutSignal?: () => AbortSignal;
  reportFailure?: (code: string) => void;
}) {
  const failure = (code: string) => {
    input.reportFailure?.(code);
    return json(code, 503);
  };
  return async function calebInstallationWorker(request: Request): Promise<Response> {
    if (request.method !== "GET") return json("method_not_allowed", 405);
    if (!isAuthorizedWorkerRequest(request, input.secret())) return json("unauthorized", 401);
    const url = new URL(request.url);
    if (
      url.search !== "" ||
      request.headers.has("content-length") ||
      request.headers.has("transfer-encoding") ||
      (await request.text()).length > 0
    ) return json("parameters_not_allowed", 400);

    let runtime: InstallationRuntime;
    try {
      runtime = await input.resolveRuntime();
    } catch {
      return failure("installation_configuration_invalid");
    }

    const signal = input.timeoutSignal?.() ?? AbortSignal.timeout(45_000);
    try {
      const result = await runtime.runScheduled({ signal });
      if (
        !Number.isSafeInteger(result.pulled) ||
        result.pulled < 0 ||
        result.pulled > 1 ||
        !Number.isSafeInteger(result.acknowledged) ||
        result.acknowledged < 0 ||
        result.acknowledged > result.pulled ||
        typeof result.healthReported !== "boolean"
      ) return failure("installation_worker_failed");
      return json(
        result.pulled === 0 && !result.healthReported
          ? "installation_worker_idle"
          : "installation_worker_complete",
        200,
        result,
      );
    } catch {
      return failure(
        signal.aborted ? "installation_worker_timeout" : "installation_worker_failed",
      );
    }
  };
}
