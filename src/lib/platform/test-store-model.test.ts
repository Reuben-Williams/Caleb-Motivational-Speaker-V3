import { describe, expect, it } from "vitest";

import { getCommerceEnvironment } from "./environment";
import { getTestStoreModel } from "./test-store-model";

function guardedEnvironment() {
  return getCommerceEnvironment({
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
    DATABASE_URL: "postgresql://user:pass@preview-db.example/neondb?sslmode=require",
    COMMERCE_PREVIEW_DATABASE_HOST: "preview-db.example",
    STRIPE_SECRET_KEY: `sk_test_${"a".repeat(32)}`,
    STRIPE_CONNECTED_ACCOUNT_ID: "acct_1U8uzX1gSFcbhQ7k",
    COMMERCE_TEST_ACCESS_TOKEN: "b".repeat(32),
    COMMERCE_WORKER_SECRET: "c".repeat(32),
  });
}

describe("private test Store model", () => {
  it("shows only the server-owned physical fixture behind the shared Preview guard", () => {
    expect(getTestStoreModel(guardedEnvironment())).toMatchObject({
      enabled: true,
      label: "TEST / PREVIEW",
      offers: [{ stableKey: "caleb-print-book-preview-test", unitAmountMinor: 100 }],
    });
  });

  it("fails closed outside the guarded branch", () => {
    const environment = guardedEnvironment();
    const changed = { ...environment, previewGuard: { ...environment.previewGuard, ready: false } };
    expect(getTestStoreModel(changed)).toEqual({
      enabled: false,
      label: "TEST / PREVIEW",
      offers: [],
    });
  });
});
