import { isIP } from "node:net";

import { createDataPlaneSession } from "@reuben-williams/next/database";
import { createPostgresDataPlane } from "@reuben-williams/next/database/server";

import { createInquiryIdentityKeyring } from "@/lib/inquiries/identity";
import { createNativeInquiryGateway } from "@/lib/inquiries/native-gateway";
import { createNativeInquiryService } from "@/lib/inquiries/native-service";
import { PostgresInquiryRepository } from "@/lib/inquiries/postgres-inquiry-repository";
import { TurnstileVerifier } from "@/lib/inquiries/turnstile-verifier";
import { UpstashInquiryStore } from "@/lib/inquiries/upstash-store";

type InquiryEnvironment = Record<string, string | undefined>;
type InquiryRuntimeDiagnostic = {
  code: "missing_configuration" | "invalid_configuration";
  component: string;
};
type InquiryRuntimeDiagnosticSink = (
  diagnostic: InquiryRuntimeDiagnostic,
) => void;

const requiredKeys = [
  "DATABASE_URL",
  "NATIVE_INQUIRY_SITE_ID",
  "NATIVE_INQUIRY_RUNTIME_MEMBER_ID",
  "NATIVE_INQUIRY_CAPABILITIES_JSON",
  "RESEND_FROM_EMAIL",
  "INQUIRY_NOTIFICATION_EMAIL",
  "TURNSTILE_SECRET_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "INQUIRY_REDIS_NAMESPACE",
  "INQUIRY_HMAC_ACTIVE_KEY_ID",
  "INQUIRY_HMAC_SECRET",
  "INQUIRY_HMAC_PREVIOUS_KEYS_JSON",
] as const;

const requiredCapabilities = Object.freeze([
  "forms.submit",
  "customers.write",
  "leads.write",
  "messaging.enqueue",
]);

export function createNativeInquirySession(environment: InquiryEnvironment) {
  const parsed = JSON.parse(
    environment.NATIVE_INQUIRY_CAPABILITIES_JSON!,
  ) as unknown;
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    throw new Error("Native inquiry capabilities are invalid.");
  }
  const capabilities = parsed as string[];
  if (
    capabilities.length !== requiredCapabilities.length ||
    requiredCapabilities.some((capability) => !capabilities.includes(capability))
  ) {
    throw new Error("Native inquiry capabilities are not minimal.");
  }
  return createDataPlaneSession({
    siteId: environment.NATIVE_INQUIRY_SITE_ID!,
    memberId: environment.NATIVE_INQUIRY_RUNTIME_MEMBER_ID!,
    capabilities,
  });
}

export function createInquiryRuntime(
  environment: InquiryEnvironment,
  reportDiagnostic: InquiryRuntimeDiagnosticSink = (diagnostic) =>
    console.error("Inquiry runtime configuration", diagnostic),
) {
  const missingKey = requiredKeys.find((key) => !environment[key]?.trim());
  if (missingKey) {
    reportDiagnostic({
      code: "missing_configuration",
      component: missingKey,
    });
    return null;
  }

  let identityKeyring;
  try {
    identityKeyring = createInquiryIdentityKeyring({
      activeKeyId: environment.INQUIRY_HMAC_ACTIVE_KEY_ID,
      activeSecret: environment.INQUIRY_HMAC_SECRET,
      previousKeysJson: environment.INQUIRY_HMAC_PREVIOUS_KEYS_JSON,
    });
  } catch {
    reportDiagnostic({
      code: "invalid_configuration",
      component: "inquiry_identity_keyring",
    });
    return null;
  }

  let session;
  try {
    session = createNativeInquirySession(environment);
  } catch {
    reportDiagnostic({
      code: "invalid_configuration",
      component: "native_inquiry_session",
    });
    return null;
  }

  try {
    const store = new UpstashInquiryStore(
      environment.UPSTASH_REDIS_REST_URL!,
      environment.UPSTASH_REDIS_REST_TOKEN!,
      environment.INQUIRY_REDIS_NAMESPACE!,
    );
    const database = createPostgresDataPlane({
      connectionString: environment.DATABASE_URL!,
      maximumPoolSize: 4,
    });
    const repository = new PostgresInquiryRepository({
      database,
      session,
      reportFailure: (code) =>
        console.error("Inquiry database failure", { code }),
    });
    const gateway = createNativeInquiryGateway({
      repository,
      from: environment.RESEND_FROM_EMAIL!,
      notificationEmail: environment.INQUIRY_NOTIFICATION_EMAIL!,
      replyTo: environment.INQUIRY_NOTIFICATION_EMAIL!,
    });
    const spam = new TurnstileVerifier(environment.TURNSTILE_SECRET_KEY!);

    return createNativeInquiryService({
      identityKeyring,
      gateway,
      spam,
      reportFailure: (component) =>
        console.error("Inquiry submission failure", { component }),
      coordination: {
        incrementRateKey: (key, ttlSeconds, limit) =>
          store.incrementRateKey(key, ttlSeconds, limit),
        acquireProcessingLease: (key, owner, ttlSeconds) =>
          store.acquireProcessingLease(key, owner, ttlSeconds),
        releaseProcessingLease: (key, owner) =>
          store.releaseProcessingLease(key, owner),
      },
    });
  } catch {
    reportDiagnostic({
      code: "invalid_configuration",
      component: "inquiry_runtime",
    });
    return null;
  }
}

export function trustedClientIpFromRequest(
  request: Request,
  trustedHeader: string | undefined,
) {
  if (!trustedHeader?.trim()) return undefined;
  const raw = request.headers.get(trustedHeader.trim());
  if (!raw) return undefined;
  const candidate = raw.split(",")[0]?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : undefined;
}
