import "server-only";

import type { CommercePreviewGuard } from "./preview-guard";

export type CalebPreviewOffer = Readonly<{
  offerId: string;
  revisionId: string;
  priceRevisionId: string;
  productId: string;
  productRevisionIds: readonly string[];
  stableKey: "caleb-print-book-preview-test";
  sku: "CJ-SPGP-PRINT-PREVIEW-TEST";
  title: "TEST ORDER — Shedding Pounds, Gaining Purpose";
  currency: "USD";
  unitAmountMinor: 100;
  quantity: 1;
  taxMode: "not_collected";
  shipping: Readonly<{
    mode: "fixed";
    amountMinor: 0;
    displayName: "TEST Shipping — $0";
    allowedCountries: readonly ["US"];
  }>;
  productKind: "physical";
  fulfillmentMode: "manual";
  processingOwner: "platform";
}>;

const TEST_OFFER: CalebPreviewOffer = Object.freeze({
  offerId: "31da4e16-255c-55b0-a47d-10024c80ef36",
  revisionId: "e2df7457-9d81-5c9c-8dd1-e29eec8de2f5",
  priceRevisionId: "13b50fb3-f5f4-5dd7-abbd-63ee9acf0622",
  productId: "d6176f43-20c4-5fab-8448-b97cc40fd3dd",
  productRevisionIds: Object.freeze(["788c2df7-a54d-5b21-bab3-3566fc1c9087"]),
  stableKey: "caleb-print-book-preview-test",
  sku: "CJ-SPGP-PRINT-PREVIEW-TEST",
  title: "TEST ORDER — Shedding Pounds, Gaining Purpose",
  currency: "USD",
  unitAmountMinor: 100,
  quantity: 1,
  taxMode: "not_collected",
  shipping: Object.freeze({
    mode: "fixed",
    amountMinor: 0,
    displayName: "TEST Shipping — $0",
    allowedCountries: Object.freeze(["US"] as const),
  }),
  productKind: "physical",
  fulfillmentMode: "manual",
  processingOwner: "platform",
});

export function listCalebPreviewOffers(guard: CommercePreviewGuard): readonly CalebPreviewOffer[] {
  return guard.ready ? Object.freeze([TEST_OFFER]) : Object.freeze([]);
}
