import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createCalebPreviewConsent } from "./preview-consent";

const COPY = "This is a test-only operational purchase. No marketing consent is requested.";

describe("Caleb Preview BuyerIntent consent", () => {
  it("freezes non-marketing consent and the synthetic identity HMAC exactly", () => {
    const secret = "i".repeat(32);
    expect(createCalebPreviewConsent(secret)).toEqual({
      normalizedEmailHmac: createHmac("sha256", secret)
        .update("caleb.preview.order@example.test")
        .digest("hex"),
      consentChoice: "transactional_only",
      consentCopy: COPY,
      consentCopyDigest: createHash("sha256").update(COPY, "utf8").digest("hex"),
      policyVersion: "caleb-preview-commerce-test-v1",
      consentResolution: "not_granted",
      consentEvidenceId: null,
      closeConsent: false,
      eraseIdentityAfterResolution: true,
    });
  });

  it("rejects an absent or weak identity secret", () => {
    expect(() => createCalebPreviewConsent("short")).toThrow(/identity secret/i);
  });
});
