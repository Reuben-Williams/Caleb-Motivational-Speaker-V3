import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

describe("independent commerce route capabilities", () => {
  it("does not let digital storage or Resend block payment status", () => {
    expect(source("src/app/api/commerce/orders/status/route.ts")).toContain("capabilities.statusReady");
    expect(source("src/app/checkout/success/page.tsx")).toContain("capabilities.statusReady");
  });

  it("keeps the library and customer auth closed until digital delivery is approved", () => {
    for (const path of [
      "src/app/library/page.tsx",
      "src/app/library/sign-in/page.tsx",
      "src/app/api/customer-auth/request-link/route.ts",
      "src/app/api/customer-auth/callback/route.ts",
      "src/app/api/commerce/assets/[assetId]/route.ts",
    ]) {
      expect(source(path)).toContain("capabilities.digitalDeliveryReady");
    }
  });

  it("gates Resend ingress independently", () => {
    expect(source("src/app/api/commerce/resend/webhook/route.ts"))
      .toContain("capabilities.resendWebhookReady");
  });
});
