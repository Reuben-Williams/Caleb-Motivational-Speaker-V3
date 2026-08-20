import { createPrivateAssetBoundary } from "@/lib/platform/customer-access";
import { getCommerceEnvironment } from "@/lib/platform/environment";

export const runtime = "nodejs";

const environment = getCommerceEnvironment();
const handleAsset = createPrivateAssetBoundary({
  enabled: environment.providersReady && environment.runtimeEnabled,
  async handle() {
    return Response.json(
      { error: { code: "CUSTOMER_ACCESS_NOT_READY" } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  },
});

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  return handleAsset(request, (await context.params).assetId);
}
