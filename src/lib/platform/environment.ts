import "server-only";

import { evaluateCommercePreviewGuard, type CommercePreviewGuard } from "./preview-guard";

export const COMMERCE_MODES = [
  "legacy_primary",
  "platform_test",
  "platform_primary",
  "paused",
] as const;

export type CommerceMode = (typeof COMMERCE_MODES)[number];

type EnvironmentInput = Readonly<Record<string, string | undefined>>;

const PROVIDER_KEYS = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CONNECTED_ACCOUNT_ID",
  "CUSTOMER_AUTH_SECRET",
  "COMMERCE_WORKER_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "COMMERCE_RESEND_API_KEY",
  "COMMERCE_RESEND_WEBHOOK_SECRET",
  "COMMERCE_RESEND_FROM_EMAIL",
] as const;

export type CommerceEnvironment = Readonly<{
  mode: CommerceMode;
  siteOrigin: string;
  legacyStoreUrl: string;
  providersReady: boolean;
  runtimeEnabled: boolean;
  missing: readonly string[];
  testAccessToken: string | null;
  previewGuard: CommercePreviewGuard;
  capabilities: Readonly<{
    checkoutCreateReady: boolean;
    stripeWebhookReady: boolean;
    resendWebhookReady: boolean;
    statusReady: boolean;
    paidOrderSagaReady: boolean;
    resendDeliveryWorkerReady: boolean;
    assetStorageReady: boolean;
    digitalDeliveryReady: boolean;
  }>;
}>;

export function getCommerceEnvironment(
  source: EnvironmentInput = process.env,
): CommerceEnvironment {
  const requestedMode = source.COMMERCE_MODE;
  const mode = COMMERCE_MODES.includes(requestedMode as CommerceMode)
    ? (requestedMode as CommerceMode)
    : "legacy_primary";
  const missing = PROVIDER_KEYS.filter((key) => !source[key]?.trim());
  const previewGuard = evaluateCommercePreviewGuard(source);
  const databaseReady = present(source.DATABASE_URL);
  const stripeReady = present(source.STRIPE_SECRET_KEY)
    && source.STRIPE_SECRET_KEY!.startsWith("sk_test_")
    && source.STRIPE_CONNECTED_ACCOUNT_ID === "acct_1U8uzX1gSFcbhQ7k";
  const metadataReady = secret(source.STRIPE_METADATA_HMAC_SECRET);
  const workerReady = secret(source.COMMERCE_WORKER_SECRET);
  const customerReady = secret(source.CUSTOMER_AUTH_SECRET);
  const currentKeyVersion = source.SHIPPING_KEK_CURRENT_VERSION;
  const shippingReady = present(source.SHIPPING_KEK_VERSIONS)
    && /^V[1-9][0-9]{0,5}$/.test(currentKeyVersion ?? "")
    && secret(source[`SHIPPING_KEK_${currentKeyVersion ?? ""}`])
    && secret(source.SHIPPING_EVIDENCE_HMAC_SECRET);
  const resendApiReady = secret(source.COMMERCE_RESEND_API_KEY)
    && present(source.COMMERCE_RESEND_FROM_EMAIL)
    && present(source.INQUIRY_NOTIFICATION_EMAIL);
  const capabilities = Object.freeze({
    checkoutCreateReady: previewGuard.ready && databaseReady && stripeReady
      && metadataReady && customerReady,
    stripeWebhookReady: previewGuard.ready && databaseReady && stripeReady
      && present(source.STRIPE_WEBHOOK_SECRET) && metadataReady,
    resendWebhookReady: previewGuard.ready && databaseReady
      && present(source.COMMERCE_RESEND_WEBHOOK_SECRET),
    statusReady: previewGuard.ready && databaseReady && customerReady,
    paidOrderSagaReady: previewGuard.ready && databaseReady && workerReady && shippingReady,
    resendDeliveryWorkerReady: previewGuard.ready && databaseReady && workerReady && resendApiReady,
    assetStorageReady: [
      "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME",
    ].every((key) => present(source[key])),
    digitalDeliveryReady: false,
  });

  return Object.freeze({
    mode,
    siteOrigin: safeHttpsOrigin(source.NEXT_PUBLIC_SITE_URL),
    legacyStoreUrl: safeHttpsUrl(
      source.COMMERCE_LEGACY_STORE_URL,
      "https://joyfound.calebjakes.com/",
    ),
    providersReady: Object.values(capabilities).every(Boolean),
    runtimeEnabled: source.COMMERCE_RUNTIME_ENABLED === "true",
    missing: Object.freeze([...missing]),
    testAccessToken:
      typeof source.COMMERCE_TEST_ACCESS_TOKEN === "string"
      && source.COMMERCE_TEST_ACCESS_TOKEN.length >= 32
        ? source.COMMERCE_TEST_ACCESS_TOKEN
        : null,
    previewGuard,
    capabilities,
  });
}

function present(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function secret(value: string | undefined): boolean {
  return typeof value === "string" && value.length >= 32;
}

function safeHttpsOrigin(value: string | undefined): string {
  try {
    const parsed = new URL(value ?? "https://www.calebjakesspeaks.com");
    if (parsed.protocol !== "https:") throw new TypeError("HTTPS is required.");
    return parsed.origin;
  } catch {
    return "https://www.calebjakesspeaks.com";
  }
}

function safeHttpsUrl(value: string | undefined, fallback: string): string {
  try {
    const parsed = new URL(value ?? fallback);
    if (parsed.protocol !== "https:") throw new TypeError("HTTPS is required.");
    return parsed.toString();
  } catch {
    return fallback;
  }
}
