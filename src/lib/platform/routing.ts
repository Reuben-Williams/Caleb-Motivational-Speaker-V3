import { timingSafeEqual } from "node:crypto";

import { calebCommerceConfig } from "@/config/commerce";

import type { CommerceMode } from "./environment";

const LEGACY_STORE_URL = "https://joyfound.calebjakes.com/";

export type ApprovedOffer = Readonly<{
  offerId: string;
  revisionId: string;
  stableKey: string;
  title: string;
  currency: "USD";
  unitAmountMinor: number;
  productRevisionIds: readonly string[];
  processingOwner: "platform";
}>;

type CheckoutDecision =
  | Readonly<{ accepted: true; offer: ApprovedOffer }>
  | Readonly<{
      accepted: false;
      reason:
        | "PLATFORM_CHECKOUT_CLOSED"
        | "TEST_ACCESS_DENIED"
        | "BROWSER_FIELDS_REJECTED"
        | "OFFER_UNAVAILABLE";
    }>;

export function getPublicStoreRoute(
  mode: CommerceMode,
): Readonly<{ kind: "external"; href: string } | { kind: "internal"; href: string }> {
  if (
    mode === "platform_primary"
    && calebCommerceConfig.cutover.platformActivationAllowed
  ) {
    return Object.freeze({ kind: "internal", href: "/store" });
  }
  return Object.freeze({ kind: "external", href: LEGACY_STORE_URL });
}

export function listApprovedOffers(): readonly ApprovedOffer[] {
  return Object.freeze(
    calebCommerceConfig.catalog.offers.flatMap((offer) => {
      if (
        offer.approvalState !== "approved"
        || offer.priceRevision.approvalState !== "approved"
        || offer.priceRevision.currency !== "USD"
        || offer.priceRevision.unitAmountMinor === null
        || offer.taxMode === "pending_owner_decision"
      ) {
        return [];
      }
      return [Object.freeze({
        offerId: offer.offerId,
        revisionId: offer.revisionId,
        stableKey: offer.stableKey,
        title: offer.title,
        currency: offer.priceRevision.currency,
        unitAmountMinor: offer.priceRevision.unitAmountMinor,
        productRevisionIds: Object.freeze([...offer.productRevisionIds]),
        processingOwner: "platform" as const,
      })];
    }),
  );
}

export function evaluateCheckoutRequest(input: Readonly<{
  mode: CommerceMode;
  configuredTestToken: string | null;
  suppliedTestToken: string | null;
  offerStableKey: string;
  browserFields: Readonly<Record<string, unknown>>;
}>): CheckoutDecision {
  if (input.mode !== "platform_test") {
    return Object.freeze({ accepted: false, reason: "PLATFORM_CHECKOUT_CLOSED" });
  }
  if (Object.keys(input.browserFields).length > 0) {
    return Object.freeze({ accepted: false, reason: "BROWSER_FIELDS_REJECTED" });
  }
  if (!safeTokenMatch(input.configuredTestToken, input.suppliedTestToken)) {
    return Object.freeze({ accepted: false, reason: "TEST_ACCESS_DENIED" });
  }
  const offer = listApprovedOffers().find(
    (candidate) => candidate.stableKey === input.offerStableKey,
  );
  if (!offer) {
    return Object.freeze({ accepted: false, reason: "OFFER_UNAVAILABLE" });
  }
  return Object.freeze({ accepted: true, offer });
}

function safeTokenMatch(expected: string | null, supplied: string | null): boolean {
  if (!expected || !supplied || expected.length < 32 || supplied.length < 32) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
