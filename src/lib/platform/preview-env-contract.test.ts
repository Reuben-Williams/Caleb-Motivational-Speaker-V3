import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Preview environment template", () => {
  it("documents every guarded physical-commerce variable without secret values", () => {
    const template = readFileSync(resolve(".env.example"), "utf8");
    for (const name of [
      "COMMERCE_PREVIEW_FIXTURE_ENABLED",
      "COMMERCE_PREVIEW_DATABASE_HOST",
      "STRIPE_METADATA_HMAC_SECRET",
      "SHIPPING_KEK_VERSIONS",
      "SHIPPING_KEK_CURRENT_VERSION",
      "SHIPPING_KEK_V1",
      "SHIPPING_EVIDENCE_HMAC_SECRET",
    ]) {
      expect(template).toMatch(new RegExp(`^${name}=$`, "m"));
    }
    expect(template).toContain("R2 is intentionally optional");
    expect(template).not.toMatch(/^STRIPE_SECRET_KEY=sk_/m);
  });
});
