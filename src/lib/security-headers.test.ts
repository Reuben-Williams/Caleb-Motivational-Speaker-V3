import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";
import { productionSecurityHeaders } from "@/lib/security-headers";

function headerValue(key: string): string | undefined {
  return productionSecurityHeaders.find((header) => header.key === key)?.value;
}

describe("production security headers", () => {
  it("enforces a Turnstile- and Supabase-compatible content security policy", () => {
    const csp = headerValue("Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("sets anti-framing, MIME, referrer, and least-privilege browser policies", () => {
    expect(headerValue("X-Frame-Options")).toBe("DENY");
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerValue("Permissions-Policy")).toContain("camera=()");
    expect(headerValue("Permissions-Policy")).toContain("microphone=()");
    expect(headerValue("Permissions-Policy")).not.toContain("payment=()");
  });

  it("applies the security headers to every non-static Next route", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers!();

    expect(rules).toEqual([
      {
        source: "/(.*)",
        headers: productionSecurityHeaders,
      },
    ]);
  });
});
