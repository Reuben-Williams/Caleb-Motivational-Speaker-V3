import "server-only";

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
}>;

export function getCommerceEnvironment(
  source: EnvironmentInput = process.env,
): CommerceEnvironment {
  const requestedMode = source.COMMERCE_MODE;
  const mode = COMMERCE_MODES.includes(requestedMode as CommerceMode)
    ? (requestedMode as CommerceMode)
    : "legacy_primary";
  const missing = PROVIDER_KEYS.filter((key) => !source[key]?.trim());

  return Object.freeze({
    mode,
    siteOrigin: safeHttpsOrigin(source.NEXT_PUBLIC_SITE_URL),
    legacyStoreUrl: safeHttpsUrl(
      source.COMMERCE_LEGACY_STORE_URL,
      "https://joyfound.calebjakes.com/",
    ),
    providersReady: missing.length === 0,
    runtimeEnabled: source.COMMERCE_RUNTIME_ENABLED === "true",
    missing: Object.freeze([...missing]),
    testAccessToken:
      typeof source.COMMERCE_TEST_ACCESS_TOKEN === "string"
      && source.COMMERCE_TEST_ACCESS_TOKEN.length >= 32
        ? source.COMMERCE_TEST_ACCESS_TOKEN
        : null,
  });
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
