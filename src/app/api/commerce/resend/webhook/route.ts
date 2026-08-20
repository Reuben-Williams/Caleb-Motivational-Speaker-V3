import { getCommerceEnvironment } from "@/lib/platform/environment";
import { createProviderWebhookBoundary } from "@/lib/platform/runtime-boundaries";

export const runtime = "nodejs";

const environment = getCommerceEnvironment();

export const POST = createProviderWebhookBoundary({
  enabled: environment.runtimeEnabled && environment.providersReady,
  async handle() {
    return Response.json(
      { error: { code: "MESSAGING_RECONCILIATION_NOT_READY" } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  },
});
