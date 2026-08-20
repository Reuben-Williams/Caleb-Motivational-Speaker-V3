import "server-only";

import {
  createStripeRuntimeClient,
  createStripeWebhookRoute,
} from "@reuben-williams/next/commerce/server";

import { getCommerceEnvironment } from "./environment";
import { createProviderWebhookBoundary } from "./runtime-boundaries";

export function createCalebStripeWebhookRoute(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const environment = getCommerceEnvironment(source);
  const secretKey = source.STRIPE_SECRET_KEY ?? "";
  const endpointSecret = source.STRIPE_WEBHOOK_SECRET ?? "";
  const connectedAccountId = source.STRIPE_CONNECTED_ACCOUNT_ID ?? "";
  const enabled = environment.runtimeEnabled
    && environment.providersReady
    && secretKey.startsWith("sk_test_")
    && endpointSecret.startsWith("whsec_")
    && /^acct_[A-Za-z0-9_]+$/.test(connectedAccountId);

  if (!enabled) {
    return createProviderWebhookBoundary({
      enabled: false,
      async handle() { return new Response(null, { status: 503 }); },
    });
  }

  const client = createStripeRuntimeClient({ secretKey, environment: "test" });
  const verifiedRoute = createStripeWebhookRoute({
    endpointSecret,
    environment: "test",
    connectedAccountId,
    verifier: client,
    async handle() {
      throw new TypeError("Stripe reconciliation persistence is not provisioned.");
    },
  });
  return createProviderWebhookBoundary({ enabled: true, handle: verifiedRoute });
}
