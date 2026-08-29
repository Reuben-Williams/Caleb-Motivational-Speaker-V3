import { isIP } from "node:net";

import { HighLevelClient } from "@/lib/inquiries/highlevel-client";
import { parseHighLevelFieldManifest } from "@/lib/inquiries/highlevel-field-manifest";
import { HighLevelInquiryGateway } from "@/lib/inquiries/highlevel-gateway";
import { createInquiryIdentityKeyring } from "@/lib/inquiries/identity";
import { createInquiryService } from "@/lib/inquiries/service";
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
  "HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN",
  "HIGHLEVEL_LOCATION_ID",
  "HIGHLEVEL_PIPELINE_ID",
  "HIGHLEVEL_NEW_INQUIRY_STAGE_ID",
  "HIGHLEVEL_FIELD_MAP_JSON",
  "TURNSTILE_SECRET_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "INQUIRY_HMAC_ACTIVE_KEY_ID",
  "INQUIRY_HMAC_SECRET",
  "INQUIRY_HMAC_PREVIOUS_KEYS_JSON",
] as const;

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

  let manifest;
  try {
    manifest = parseHighLevelFieldManifest(
      environment.HIGHLEVEL_FIELD_MAP_JSON!,
    );
  } catch {
    reportDiagnostic({
      code: "invalid_configuration",
      component: "highlevel_field_manifest",
    });
    return null;
  }

  try {
    const store = new UpstashInquiryStore(
      environment.UPSTASH_REDIS_REST_URL!,
      environment.UPSTASH_REDIS_REST_TOKEN!,
    );
    const client = new HighLevelClient({
      token: environment.HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN!,
      locationId: environment.HIGHLEVEL_LOCATION_ID!,
    });
    const gateway = new HighLevelInquiryGateway({
      client,
      manifest,
      locationId: environment.HIGHLEVEL_LOCATION_ID!,
      pipelineId: environment.HIGHLEVEL_PIPELINE_ID!,
      stageId: environment.HIGHLEVEL_NEW_INQUIRY_STAGE_ID!,
    });
    const spam = new TurnstileVerifier(environment.TURNSTILE_SECRET_KEY!);

    return createInquiryService({
      identityKeyring,
      store,
      gateway,
      spam,
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
