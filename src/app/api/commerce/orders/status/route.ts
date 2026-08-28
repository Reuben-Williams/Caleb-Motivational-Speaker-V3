import { getCommerceEnvironment } from "@/lib/platform/environment";
import { createCheckoutStatusRoute } from "@/lib/platform/status-route";

export const runtime = "nodejs";

const environment = getCommerceEnvironment();

export const GET = createCheckoutStatusRoute({
  enabled: environment.capabilities.statusReady && environment.runtimeEnabled,
  async lookup() {
    throw new TypeError("Order persistence is not provisioned.");
  },
});
