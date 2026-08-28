import { describe, expect, it } from "vitest";

import { createPreviewReadinessRoute } from "./preview-readiness-route";

const previewEnvironment = Object.freeze({
  COMMERCE_MODE: "platform_test",
  COMMERCE_RUNTIME_ENABLED: "true",
  COMMERCE_PREVIEW_FIXTURE_ENABLED: "true",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_TARGET_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "codex/caleb-commerce-integration",
  VERCEL_BRANCH_URL: "caleb-preview.example.vercel.app",
  NEXT_PUBLIC_SITE_URL: "https://caleb-preview.example.vercel.app",
  VERCEL_PROJECT_PRODUCTION_URL: "www.calebjakes.com",
  DATABASE_URL: "postgresql://caleb:secret@preview-db.example.test/caleb",
  COMMERCE_PREVIEW_DATABASE_HOST: "different-db.example.test",
  STRIPE_SECRET_KEY: "sk_test_secret-value-that-must-never-be-returned",
  STRIPE_CONNECTED_ACCOUNT_ID: "acct_1U8uzX1gSFcbhQ7k",
  COMMERCE_TEST_ACCESS_TOKEN: "browser-secret-that-must-never-be-returned",
  COMMERCE_WORKER_SECRET: "worker-secret-that-must-never-be-returned",
});

describe("Preview commerce readiness route", () => {
  it("returns only safe readiness facts for a Preview deployment", async () => {
    const response = await createPreviewReadinessRoute(previewEnvironment)();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      ready: false,
      mode: "platform_test",
      runtimeEnabled: true,
      reasons: ["DATABASE_HOST_MISMATCH"],
    });
    expect(serialized).not.toContain("secret-value");
    expect(serialized).not.toContain("browser-secret");
    expect(serialized).not.toContain("worker-secret");
  });

  it("is unavailable outside a Preview deployment", async () => {
    const response = await createPreviewReadinessRoute({
      ...previewEnvironment,
      VERCEL_ENV: "production",
      VERCEL_TARGET_ENV: "production",
    })();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});
