import "server-only";

import { getCommerceEnvironment } from "./environment";
import { createWorkerBoundary } from "./runtime-boundaries";

export function createCalebWorkerRoute(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const environment = getCommerceEnvironment(source);
  return createWorkerBoundary({
    secret: source.COMMERCE_WORKER_SECRET ?? null,
    enabled: environment.runtimeEnabled && environment.providersReady,
    async handle() {
      return Response.json(
        { error: { code: "WORKER_RUNTIME_NOT_READY" } },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    },
  });
}
