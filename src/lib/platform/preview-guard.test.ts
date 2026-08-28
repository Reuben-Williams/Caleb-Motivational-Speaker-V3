import { describe, expect, it } from "vitest";

import { evaluateCommercePreviewGuard } from "./preview-guard";

function validEnvironment(): Record<string, string> {
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
    STRIPE_CONNECTED_ACCOUNT_ID: "acct_1U8uzX1gSFcbhQ7k",
    COMMERCE_TEST_ACCESS_TOKEN: "b".repeat(32),
    COMMERCE_WORKER_SECRET: "w".repeat(32),
  };
}

describe("Caleb commerce Preview guard", () => {
  it("accepts only the approved Vercel branch, database, and Stripe test identity", () => {
    expect(evaluateCommercePreviewGuard(validEnvironment())).toEqual({
      ready: true,
      reasons: [],
    });
  });

  it("fails closed for every copied, Production, or contradictory identity signal", () => {
    const mutations: Array<(value: Record<string, string>) => void> = [
      (value) => { value.COMMERCE_MODE = "platform_primary"; },
      (value) => { value.COMMERCE_PREVIEW_FIXTURE_ENABLED = "false"; },
      (value) => { value.VERCEL = "0"; },
      (value) => { value.VERCEL_ENV = "production"; },
      (value) => { value.VERCEL_TARGET_ENV = "production"; },
      (value) => { value.VERCEL_GIT_COMMIT_REF = "main"; },
      (value) => { value.NEXT_PUBLIC_SITE_URL = "https://caleb-production.example.vercel.app"; },
      (value) => { value.COMMERCE_PREVIEW_DATABASE_HOST = "other-db.example.neon.tech"; },
      (value) => { value.STRIPE_SECRET_KEY = "sk_live_never_allowed"; },
      (value) => { value.STRIPE_CONNECTED_ACCOUNT_ID = "acct_other"; },
      (value) => { value.COMMERCE_WORKER_SECRET = value.COMMERCE_TEST_ACCESS_TOKEN!; },
    ];

    for (const mutate of mutations) {
      const environment = validEnvironment();
      mutate(environment);
      const result = evaluateCommercePreviewGuard(environment);
      expect(result.ready).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    }
  });

  it("returns safe reason codes without reflecting credentials or connection strings", () => {
    const environment = validEnvironment();
    environment.DATABASE_URL = "not-a-url-with-secret";
    const result = evaluateCommercePreviewGuard(environment);
    expect(result.ready).toBe(false);
    expect(JSON.stringify(result)).not.toContain("not-a-url-with-secret");
    expect(JSON.stringify(result)).not.toContain(environment.COMMERCE_TEST_ACCESS_TOKEN);
  });
});
