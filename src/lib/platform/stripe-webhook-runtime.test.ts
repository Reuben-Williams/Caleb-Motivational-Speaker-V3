import { describe, expect, it } from "vitest";

import { createCalebStripeWebhookRoute } from "./stripe-webhook-runtime";

function source() {
  return {
    COMMERCE_MODE: "platform_test",
    COMMERCE_RUNTIME_ENABLED: "true",
    COMMERCE_PREVIEW_FIXTURE_ENABLED: "true",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_TARGET_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "codex/caleb-commerce-integration",
    VERCEL_BRANCH_URL: "caleb-preview.example.vercel.app",
    VERCEL_PROJECT_PRODUCTION_URL: "caleb-production.example.vercel.app",
    NEXT_PUBLIC_SITE_URL: "https://caleb-preview.example.vercel.app",
    DATABASE_URL: "postgresql://preview-user:secret@preview-db.example.neon.tech/caleb?sslmode=require",
    COMMERCE_PREVIEW_DATABASE_HOST: "preview-db.example.neon.tech",
    STRIPE_SECRET_KEY: "sk_test_example_secret_key_value",
    STRIPE_WEBHOOK_SECRET: "whsec_test_example_value",
    STRIPE_METADATA_HMAC_SECRET: "m".repeat(32),
    STRIPE_CONNECTED_ACCOUNT_ID: "acct_1U8uzX1gSFcbhQ7k",
    COMMERCE_TEST_ACCESS_TOKEN: "b".repeat(32),
    COMMERCE_WORKER_SECRET: "w".repeat(32),
  };
}

describe("Caleb Stripe webhook capability", () => {
  it("reaches signature verification without R2, Resend, or customer-auth configuration", async () => {
    const route = createCalebStripeWebhookRoute(source());
    const response = await route(new Request(
      "https://caleb-preview.example.vercel.app/api/commerce/stripe/webhook",
      { method: "POST", body: "{}" },
    ));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ result: "invalid" });
  });
});
