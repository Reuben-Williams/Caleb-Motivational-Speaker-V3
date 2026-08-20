import { ASSETS, OFFERS, PRODUCTS } from "./catalog";
import { deepFreeze } from "./immutability";
import { PRODUCTION_RECIPES } from "./recipes";
import { SOURCE_SNAPSHOTS } from "./source-snapshots";
import { TEMPLATES } from "./templates";
import { CALEB_RECIPE_KEYS, type CalebCommerceConfig } from "./types";

export { CALEB_RECIPE_KEYS } from "./types";
export type { CalebCommerceConfig, CalebConfigValidation } from "./types";
export { validateCalebCommerceConfig } from "./validation";

export const calebCommerceConfig: CalebCommerceConfig = deepFreeze({
  schemaVersion: 1,
  siteStableKey: "caleb-jakes-v3",
  sourceSnapshots: SOURCE_SNAPSHOTS,
  recipes: PRODUCTION_RECIPES,
  catalog: {
    products: PRODUCTS,
    offers: OFFERS,
    shipping: {
      mode: "manual_fulfillment",
      supportedCountries: [],
      shippingAmountMinor: null,
      addressRetentionDays: null,
      approvalState: "awaiting_caleb",
    },
  },
  templates: TEMPLATES,
  assets: ASSETS,
  policies: {
    policyVersion: "pending-caleb-approval",
    refundPolicy: null,
    digitalAccessPolicy: null,
    fulfillmentPolicy: null,
    privacyPolicyRoute: "/privacy",
    approvalState: "awaiting_caleb",
  },
  sender: {
    provider: "resend",
    sendingDomain: null,
    fromAddress: null,
    displayName: null,
    replyTo: "info@calebjakes.com",
    legalMailingAddressVariable: "business_mailing_address",
    approvalState: "awaiting_caleb",
  },
  consent: {
    purpose: "marketing_email",
    policyVersion: "pending-caleb-approval",
    checkboxCopy: null,
    defaultChecked: false,
    transactionalPurchaseIsMarketingConsent: false,
    approvalState: "awaiting_caleb",
  },
  providers: {
    stripe: { ownership: "client_owned_connect_standard", mode: "test", processingOwner: "platform" },
    objectStorage: { provider: "cloudflare_r2", visibility: "private", permanentPublicUrls: false },
    dataPlane: { provider: "neon_postgres", status: "not_provisioned" },
    email: { provider: "resend", status: "not_configured" },
  },
  orderRouting: {
    eventType: "commerce.line_item_paid",
    runScope: "one_run_per_eligible_line_item",
    multiItemOrdersSupported: true,
  },
  cutover: {
    currentState: "legacy_primary",
    legacyOwner: "highlevel",
    platformActivationAllowed: false,
    highlevelMutationAllowed: false,
  },
});

if (calebCommerceConfig.recipes.length !== CALEB_RECIPE_KEYS.length) {
  throw new Error("Caleb commerce recipe registry is incomplete.");
}
