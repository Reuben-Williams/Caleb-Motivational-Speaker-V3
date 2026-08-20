export const CALEB_RECIPE_KEYS = [
  "caleb.book_purchased.v1",
  "caleb.book_nurture.v1",
  "caleb.audiobook_purchased.v1",
  "caleb.course_purchased.v1",
  "caleb.workbook_purchased.v1",
] as const;

export type CalebRecipeKey = (typeof CALEB_RECIPE_KEYS)[number];
export type ApprovalState = "awaiting_caleb" | "approved";
export type ProductKind = "physical" | "digital_download" | "course";

export type SourceStep = {
  key: string;
  type: string;
  delayMinutes?: number;
  subject?: string;
  linkDestinationKind?: "google_drive_share" | "highlevel_preview_url" | "membership_login_variable";
  exactLinkCaptured?: boolean;
  tagPurpose?: string;
  conditionSummary?: string;
  branchOutcomes?: string[];
  offerName?: string;
  variable?: string;
  urgencyClaims?: string[];
};

export type SourceSnapshot = {
  version: 1;
  snapshotId: string;
  recipeKey: CalebRecipeKey;
  providerKey: "highlevel";
  providerDisplayName: "HighLevel";
  locationId: "2FqgdrmWP252v43cX5RY";
  externalWorkflowId: string;
  sourceName: string;
  sourceStatus: "published";
  lastObservedAt: string;
  observationTimePrecision: "bounded_by_design_record";
  capturedAt: string;
  normalized: {
    triggers: Array<Record<string, string | number | boolean>>;
    steps: SourceStep[];
    settings: {
      allowReentry: true;
      allowMultipleOpportunities: true;
      stopOnResponse: false;
      sendingTimeRestrictions: false;
      clickTracking: false;
      utmTracking: false;
      tagOnInteraction: false;
      templateSynchronization: false;
      markConversationRead: false;
      timezoneSource: "highlevel_account";
      senderSource: "highlevel_default";
    };
  };
  contentDigest: string;
  evidencePath: string;
  sanitizedSourceUrl: string;
  findings: Array<{ code: string; severity: "info" | "warning" | "critical"; message: string }>;
  executable: false;
};

export type RecipeStep = {
  key: string;
  type: string;
  delayMinutes?: number;
  templateKey?: string;
  campaignRecipeKey?: CalebRecipeKey;
  condition?: string;
  routeKind?: "passwordless_library";
  taskKind?: "manual_physical_fulfillment";
  entitlementScope?: "line_item";
};

export type ProductionRecipe = {
  recipeKey: CalebRecipeKey;
  revisionId: string;
  revisionNumber: 1;
  runtime: "automation_v2" | "campaigns";
  derivedFromSnapshotId: string;
  deviationCodes: string[];
  trigger: Record<string, string | boolean>;
  steps: RecipeStep[];
  operationalState: "inactive";
  reviewState: "draft";
  workingRevisionId: string;
  approvedRevisionId: null;
  activeRevisionId: null;
  activationRequiresHumanApproval: true;
};

export type ProductConfiguration = {
  productId: string;
  revisionId: string;
  stableKey: string;
  title: string;
  titleApproval: ApprovalState;
  kind: ProductKind;
  recipeKey: CalebRecipeKey;
  sku: string | null;
  skuApproval: ApprovalState;
};

export type OfferConfiguration = {
  offerId: string;
  revisionId: string;
  stableKey: string;
  title: string;
  productRevisionIds: string[];
  approvalState: ApprovalState;
  priceRevision: {
    revisionId: string;
    currency: "USD" | null;
    unitAmountMinor: number | null;
    observedSourceAmountMinor: number | null;
    approvalState: ApprovalState;
  };
  taxMode: "automatic_exclusive" | "automatic_inclusive" | "not_collected" | "pending_owner_decision";
};

export type MessageTemplate = {
  templateId: string;
  revisionId: string;
  stableKey: string;
  purpose: "transactional" | "marketing";
  subject: string;
  body: string;
  variableKeys: string[];
  linkDestinations: string[];
  state: "draft";
  approvalState: ApprovalState;
};

export type AssetRecord = {
  assetId: string;
  productRevisionId: string;
  role: "commerce_marketing_image" | "paid_customer_content";
  sourceLabel: string;
  repositoryPath: string | null;
  sizeBytes: number | null;
  mediaType: string | null;
  sha256: string | null;
  provenance: string;
  sourceState: "verified" | "missing";
  approvalState: ApprovalState;
  destinationKey: string | null;
  visibility: "public_marketing" | "private_entitled";
};

export type CalebCommerceConfig = {
  schemaVersion: 1;
  siteStableKey: "caleb-jakes-v3";
  sourceSnapshots: SourceSnapshot[];
  recipes: ProductionRecipe[];
  catalog: {
    products: ProductConfiguration[];
    offers: OfferConfiguration[];
    shipping: {
      mode: "manual_fulfillment";
      supportedCountries: string[];
      shippingAmountMinor: number | null;
      addressRetentionDays: number | null;
      approvalState: ApprovalState;
    };
  };
  templates: {
    transactional: MessageTemplate[];
    campaign: MessageTemplate[];
  };
  assets: {
    marketing: AssetRecord[];
    digital: AssetRecord[];
  };
  policies: {
    policyVersion: string;
    refundPolicy: string | null;
    digitalAccessPolicy: string | null;
    fulfillmentPolicy: string | null;
    privacyPolicyRoute: "/privacy";
    approvalState: ApprovalState;
  };
  sender: {
    provider: "resend";
    sendingDomain: string | null;
    fromAddress: string | null;
    displayName: string | null;
    replyTo: "info@calebjakes.com";
    legalMailingAddressVariable: "business_mailing_address";
    approvalState: ApprovalState;
  };
  consent: {
    purpose: "marketing_email";
    policyVersion: string;
    checkboxCopy: string | null;
    defaultChecked: false;
    transactionalPurchaseIsMarketingConsent: false;
    approvalState: ApprovalState;
  };
  providers: {
    stripe: { ownership: "client_owned_connect_standard"; mode: "test"; processingOwner: "platform" };
    objectStorage: { provider: "cloudflare_r2"; visibility: "private"; permanentPublicUrls: false };
    dataPlane: { provider: "neon_postgres"; status: "not_provisioned" | "provisioned" };
    email: { provider: "resend"; status: "not_configured" | "configured" };
  };
  orderRouting: {
    eventType: "commerce.line_item_paid";
    runScope: "one_run_per_eligible_line_item";
    multiItemOrdersSupported: true;
  };
  cutover: {
    currentState: "legacy_primary";
    legacyOwner: "highlevel";
    platformActivationAllowed: false;
    highlevelMutationAllowed: false;
  };
};

export type CalebConfigValidation = {
  validForReview: boolean;
  activationReady: boolean;
  errors: string[];
  blockers: string[];
};
