import { createCheckoutRoute } from "@/lib/platform/checkout-route";
import { getCommerceEnvironment } from "@/lib/platform/environment";

export const runtime = "nodejs";

export const POST = createCheckoutRoute({
  environment: getCommerceEnvironment(),
  async createSession() {
    throw new TypeError("Stripe checkout persistence is not provisioned.");
  },
});
