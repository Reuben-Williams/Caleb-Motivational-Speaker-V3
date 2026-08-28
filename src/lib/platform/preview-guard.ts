import "server-only";

type EnvironmentInput = Readonly<Record<string, string | undefined>>;

const APPROVED_BRANCH = "codex/caleb-commerce-integration";
const APPROVED_CONNECTED_ACCOUNT = "acct_1U8uzX1gSFcbhQ7k";

export type CommercePreviewGuard = Readonly<{
  ready: boolean;
  reasons: readonly string[];
}>;

export function evaluateCommercePreviewGuard(source: EnvironmentInput): CommercePreviewGuard {
  const reasons: string[] = [];
  requireEqual(source.COMMERCE_MODE, "platform_test", "MODE_MISMATCH", reasons);
  requireEqual(source.COMMERCE_RUNTIME_ENABLED, "true", "RUNTIME_DISABLED", reasons);
  requireEqual(source.COMMERCE_PREVIEW_FIXTURE_ENABLED, "true", "FIXTURE_DISABLED", reasons);
  requireEqual(source.VERCEL, "1", "VERCEL_IDENTITY_MISSING", reasons);
  requireEqual(source.VERCEL_ENV, "preview", "VERCEL_ENV_MISMATCH", reasons);
  requireEqual(source.VERCEL_TARGET_ENV, "preview", "VERCEL_TARGET_MISMATCH", reasons);
  requireEqual(source.VERCEL_GIT_COMMIT_REF, APPROVED_BRANCH, "BRANCH_MISMATCH", reasons);

  const branchHost = normalizedHost(source.VERCEL_BRANCH_URL);
  const siteHost = urlHost(source.NEXT_PUBLIC_SITE_URL);
  const productionHost = normalizedHost(source.VERCEL_PROJECT_PRODUCTION_URL);
  if (!branchHost || !siteHost || branchHost !== siteHost) reasons.push("BRANCH_HOST_MISMATCH");
  if (siteHost && productionHost && siteHost === productionHost) reasons.push("PRODUCTION_HOST_REJECTED");

  const databaseHost = urlHost(source.DATABASE_URL);
  const allowedDatabaseHost = normalizedHost(source.COMMERCE_PREVIEW_DATABASE_HOST);
  if (!databaseHost || !allowedDatabaseHost || databaseHost !== allowedDatabaseHost) {
    reasons.push("DATABASE_HOST_MISMATCH");
  }

  if (!source.STRIPE_SECRET_KEY?.startsWith("sk_test_")) reasons.push("STRIPE_TEST_MODE_REQUIRED");
  requireEqual(
    source.STRIPE_CONNECTED_ACCOUNT_ID,
    APPROVED_CONNECTED_ACCOUNT,
    "STRIPE_ACCOUNT_MISMATCH",
    reasons,
  );

  const browserSecret = source.COMMERCE_TEST_ACCESS_TOKEN ?? "";
  const workerSecret = source.COMMERCE_WORKER_SECRET ?? "";
  if (browserSecret.length < 32) reasons.push("BROWSER_CREDENTIAL_INVALID");
  if (workerSecret.length < 32) reasons.push("WORKER_CREDENTIAL_INVALID");
  if (browserSecret && workerSecret && browserSecret === workerSecret) {
    reasons.push("CREDENTIAL_REUSE_REJECTED");
  }

  return Object.freeze({
    ready: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)]),
  });
}

function requireEqual(
  actual: string | undefined,
  expected: string,
  reason: string,
  reasons: string[],
): void {
  if (actual !== expected) reasons.push(reason);
}

function normalizedHost(value: string | undefined): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function urlHost(value: string | undefined): string | null {
  try {
    return new URL(value ?? "").hostname.toLowerCase();
  } catch {
    return null;
  }
}
