import "server-only";

import { createHash, createHmac } from "node:crypto";

const SYNTHETIC_IDENTITY = "caleb.preview.order@example.test";
const CONSENT_COPY = "This is a test-only operational purchase. No marketing consent is requested.";

export function createCalebPreviewConsent(identitySecret: string) {
  if (typeof identitySecret !== "string" || identitySecret.length < 32) {
    throw new TypeError("Preview identity secret is missing or invalid.");
  }
  return Object.freeze({
    normalizedEmailHmac: createHmac("sha256", identitySecret)
      .update(SYNTHETIC_IDENTITY)
      .digest("hex"),
    consentChoice: "transactional_only" as const,
    consentCopy: CONSENT_COPY,
    consentCopyDigest: createHash("sha256").update(CONSENT_COPY, "utf8").digest("hex"),
    policyVersion: "caleb-preview-commerce-test-v1" as const,
    consentResolution: "not_granted" as const,
    consentEvidenceId: null,
    closeConsent: false,
    eraseIdentityAfterResolution: true,
  });
}
