import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getCommerceEnvironment } from "./environment";
import {
  evaluateCheckoutRequest,
  getPublicStoreRoute,
  listApprovedOffers,
} from "./routing";
import { parseCheckoutStatus } from "./status";

const root = process.cwd();

describe("Caleb platform attachment boundaries", () => {
  it("pins the accepted private package release and commits no credential", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const npmrc = fs.readFileSync(path.join(root, ".npmrc"), "utf8");

    expect(packageJson.dependencies["@reuben-williams/core"]).toBe("0.4.0");
    expect(packageJson.dependencies["@reuben-williams/next"]).toBe("0.4.0");
    expect(packageJson.dependencies["@reuben-williams/growth-commerce-ui"]).toBe("0.4.0");
    expect(packageJson.dependencies["@reuben-williams/growth-automations-ui"]).toBe("0.4.0");
    expect(npmrc).toContain("${NODE_AUTH_TOKEN}");
    expect(npmrc).not.toMatch(/ghp_|github_pat_|Bearer\s/i);
  });

  it("keeps provider secrets lazy and server-only", () => {
    const environment = getCommerceEnvironment({
      COMMERCE_MODE: "platform_test",
      NEXT_PUBLIC_SITE_URL: "https://www.calebjakesspeaks.com",
      COMMERCE_TEST_ACCESS_TOKEN: "a".repeat(32),
    });

    expect(environment.mode).toBe("platform_test");
    expect(environment.providersReady).toBe(false);
    expect(environment.runtimeEnabled).toBe(false);
    expect(environment.missing).toContain("DATABASE_URL");
    expect(environment.missing).toContain("STRIPE_SECRET_KEY");
  });

  it("keeps public shoppers on the verified HighLevel funnel", () => {
    expect(getPublicStoreRoute("legacy_primary")).toEqual({
      kind: "external",
      href: "https://joyfound.calebjakes.com/",
    });
    expect(getPublicStoreRoute("platform_test")).toEqual({
      kind: "external",
      href: "https://joyfound.calebjakes.com/",
    });
  });

  it("never exposes an unapproved Caleb offer", () => {
    expect(listApprovedOffers()).toEqual([]);
  });

  it("rejects public and browser-authored checkout facts", () => {
    expect(
      evaluateCheckoutRequest({
        mode: "platform_test",
        configuredTestToken: "a".repeat(32),
        suppliedTestToken: "a".repeat(32),
        offerStableKey: "caleb-print-book-single",
        browserFields: { amount: 1, stripeAccount: "acct_fake" },
      }),
    ).toEqual({ accepted: false, reason: "BROWSER_FIELDS_REJECTED" });

    expect(
      evaluateCheckoutRequest({
        mode: "platform_test",
        configuredTestToken: "a".repeat(32),
        suppliedTestToken: "wrong-token".padEnd(32, "x"),
        offerStableKey: "caleb-print-book-single",
        browserFields: {},
      }),
    ).toEqual({ accepted: false, reason: "TEST_ACCESS_DENIED" });
  });

  it("does not grant from a success redirect or query string", () => {
    expect(parseCheckoutStatus({ status: "paid", entitlement: "active" })).toEqual({
      state: "pending",
      orderId: null,
      grantsAccess: false,
    });
    expect(
      parseCheckoutStatus({
        serverState: "fulfilled",
        orderId: "7e9e6f4e-37f0-45ca-bef7-8e84a6ab7d31",
      }),
    ).toEqual({
      state: "fulfilled",
      orderId: "7e9e6f4e-37f0-45ca-bef7-8e84a6ab7d31",
      grantsAccess: true,
    });
  });
});
