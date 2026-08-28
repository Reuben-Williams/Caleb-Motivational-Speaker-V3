import { describe, expect, it } from "vitest";

import { listCalebPreviewOffers } from "./caleb-preview-catalog";

describe("Caleb physical-only Preview catalog", () => {
  it("exposes exactly one server-owned $1 physical test offer after the guard passes", () => {
    const offers = listCalebPreviewOffers({ ready: true, reasons: [] });
    expect(offers).toHaveLength(1);
    expect(offers[0]).toEqual(expect.objectContaining({
      stableKey: "caleb-print-book-preview-test",
      sku: "CJ-SPGP-PRINT-PREVIEW-TEST",
      title: "TEST ORDER — Shedding Pounds, Gaining Purpose",
      currency: "USD",
      unitAmountMinor: 100,
      quantity: 1,
      taxMode: "not_collected",
      shipping: {
        mode: "fixed",
        amountMinor: 0,
        displayName: "TEST Shipping — $0",
        allowedCountries: ["US"],
      },
      productKind: "physical",
      fulfillmentMode: "manual",
    }));
    expect(Object.isFrozen(offers)).toBe(true);
    expect(Object.isFrozen(offers[0])).toBe(true);
  });

  it("returns no fixture for a rejected or ambiguous Preview identity", () => {
    expect(listCalebPreviewOffers({ ready: false, reasons: ["BRANCH_MISMATCH"] })).toEqual([]);
  });
});
