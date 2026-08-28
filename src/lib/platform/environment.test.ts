import { describe, expect, it } from "vitest";

import { getCommerceEnvironment } from "./environment";

const guardEnvironment = {
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
  STRIPE_CONNECTED_ACCOUNT_ID: "acct_1U8uzX1gSFcbhQ7k",
  COMMERCE_TEST_ACCESS_TOKEN: "b".repeat(32),
  COMMERCE_WORKER_SECRET: "w".repeat(32),
} as const;

describe("independent commerce capabilities", () => {
  it("allows physical Checkout without R2 or Resend", () => {
    const environment = getCommerceEnvironment({
      ...guardEnvironment,
      STRIPE_METADATA_HMAC_SECRET: "m".repeat(32),
      CUSTOMER_AUTH_SECRET: "c".repeat(32),
    });

    expect(environment.capabilities.checkoutCreateReady).toBe(true);
    expect(environment.capabilities.assetStorageReady).toBe(false);
    expect(environment.capabilities.digitalDeliveryReady).toBe(false);
    expect(environment.capabilities.resendDeliveryWorkerReady).toBe(false);
  });

  it("allows Stripe ingestion and the paid saga independently of Resend and customer auth", () => {
    const environment = getCommerceEnvironment({
      ...guardEnvironment,
      STRIPE_WEBHOOK_SECRET: "whsec_test_example_value",
      STRIPE_METADATA_HMAC_SECRET: "m".repeat(32),
      SHIPPING_KEK_VERSIONS: "V1",
      SHIPPING_KEK_CURRENT_VERSION: "V1",
      SHIPPING_KEK_V1: Buffer.alloc(32, 1).toString("base64"),
      SHIPPING_EVIDENCE_HMAC_SECRET: "h".repeat(32),
    });

    expect(environment.capabilities.stripeWebhookReady).toBe(true);
    expect(environment.capabilities.paidOrderSagaReady).toBe(true);
    expect(environment.capabilities.statusReady).toBe(false);
    expect(environment.capabilities.resendDeliveryWorkerReady).toBe(false);
  });
});
