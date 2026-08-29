import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("public inquiry privacy disclosure", () => {
  it("describes the native storage, security, email, retention, and request path", () => {
    const source = readFileSync(resolve("src/app/privacy/page.tsx"), "utf8");
    for (const phrase of [
      "Caleb&apos;s website database",
      "Cloudflare Turnstile",
      "rate limiting",
      "Resend",
      "retained for 400 days",
      "info@calebjakes.com",
    ]) {
      expect(source).toContain(phrase);
    }
    expect(source).not.toContain("customer relationship management system");
    expect(source).not.toContain("does not add an application database");
  });
});
