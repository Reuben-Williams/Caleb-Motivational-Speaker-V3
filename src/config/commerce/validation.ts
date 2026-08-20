import { canonicalSha256 } from "./immutability";
import { CALEB_RECIPE_KEYS, type CalebCommerceConfig, type CalebConfigValidation } from "./types";

const SOCIAL_SUBJECT = /elevate your brand presence|social media management/i;
const PREVIEW_LINK = /app\.gohighlevel\.com\/v2\/preview/i;
const UNSUPPORTED_URGENCY = /(?:limited spots?|doors? clos(?:e|ing)|closes? at midnight|closing soon)/i;
const SECRET = /(?:sk_live|sk_test|re_[A-Za-z0-9]{8,}|ghl_[A-Za-z0-9]{8,}|bearer\s+[A-Za-z0-9._-]+)/i;
const SIGNED_URL = /X-Amz-(?:Signature|Credential)|(?:^|[?&])token=/i;
const PAID_BINARY = /\.(?:mp3|m4a|wav|pdf|zip|epub)(?:["?]|$)/i;
const PLACEHOLDER = /\{\{([a-z][a-z0-9_]*)\}\}/g;

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export function validateCalebCommerceConfig(config: CalebCommerceConfig): CalebConfigValidation {
  const errors: string[] = [];
  const blockers: string[] = [];
  const recipeKeys = config.recipes.map((recipe) => recipe.recipeKey);
  const snapshotKeys = config.sourceSnapshots.map((snapshot) => snapshot.recipeKey);

  if (JSON.stringify(recipeKeys) !== JSON.stringify(CALEB_RECIPE_KEYS)) errors.push("recipes.exact_scope_required");
  if (JSON.stringify(snapshotKeys) !== JSON.stringify(CALEB_RECIPE_KEYS)) errors.push("snapshots.exact_scope_required");
  if (!unique(config.sourceSnapshots.map((snapshot) => snapshot.snapshotId))) errors.push("snapshots.ids_not_unique");
  if (!unique(config.sourceSnapshots.map((snapshot) => snapshot.contentDigest))) errors.push("snapshots.digests_not_unique");
  for (const snapshot of config.sourceSnapshots) {
    if (snapshot.executable !== false || snapshot.contentDigest !== canonicalSha256(snapshot.normalized)) {
      errors.push(`snapshots.${snapshot.recipeKey}.invalid_digest_or_execution_state`);
    }
  }

  for (const recipe of config.recipes) {
    if (
      recipe.operationalState !== "inactive"
      || recipe.reviewState !== "draft"
      || recipe.approvedRevisionId !== null
      || recipe.activeRevisionId !== null
      || !recipe.activationRequiresHumanApproval
    ) errors.push(`recipes.${recipe.recipeKey}.must_remain_inactive`);
    if (recipe.steps.some((step) => step.type.startsWith("tag."))) {
      errors.push(`recipes.${recipe.recipeKey}.unverified_tag_action`);
    }
  }

  const allTemplates = [...config.templates.transactional, ...config.templates.campaign];
  for (const template of allTemplates) {
    const text = `${template.subject}\n${template.body}\n${template.linkDestinations.join("\n")}`;
    if (SOCIAL_SUBJECT.test(template.subject)) errors.push(`templates.${template.stableKey}.unrelated_subject`);
    if (PREVIEW_LINK.test(text)) errors.push(`templates.${template.stableKey}.preview_link`);
    if (UNSUPPORTED_URGENCY.test(text)) errors.push(`templates.${template.stableKey}.unsupported_urgency`);
    const variables = [...template.body.matchAll(PLACEHOLDER)].map((match) => match[1]!);
    const linkVariables = template.linkDestinations.flatMap((link) => [...link.matchAll(PLACEHOLDER)].map((match) => match[1]!));
    if (![...variables, ...linkVariables].every((variable) => template.variableKeys.includes(variable))) {
      errors.push(`templates.${template.stableKey}.missing_variable_contract`);
    }
    if (!unique(template.variableKeys)) errors.push(`templates.${template.stableKey}.duplicate_variable_contract`);
  }

  for (const asset of config.assets.digital) {
    const path = asset.repositoryPath ?? "";
    if (path.startsWith("/public/") || path.startsWith("public/") || /^https?:\/\//i.test(path)) {
      errors.push(`assets.${asset.assetId}.paid_asset_not_private`);
    }
  }

  const serialized = JSON.stringify(config);
  if (SECRET.test(serialized)) errors.push("security.credential_material_detected");
  if (SIGNED_URL.test(serialized)) errors.push("security.signed_url_detected");
  if (PAID_BINARY.test(serialized)) errors.push("security.paid_binary_path_detected");
  if (/customerRecords?|executionHistory/i.test(serialized)) errors.push("security.customer_or_execution_data_detected");

  if (config.catalog.products.some((product) => product.titleApproval !== "approved" || product.skuApproval !== "approved")
    || config.catalog.offers.some((offer) => offer.approvalState !== "approved" || offer.priceRevision.approvalState !== "approved" || offer.priceRevision.unitAmountMinor === null || offer.priceRevision.currency === null || offer.taxMode === "pending_owner_decision")) {
    blockers.push("catalog.owner_approval_required");
  }
  if (config.assets.digital.some((asset) => asset.sourceState !== "verified" || asset.sha256 === null || asset.destinationKey === null)) blockers.push("assets.digital_files_missing");
  if (config.sender.approvalState !== "approved" || config.sender.sendingDomain === null || config.sender.fromAddress === null || config.sender.displayName === null) blockers.push("messaging.sender_approval_required");
  if (allTemplates.some((template) => template.approvalState !== "approved")) blockers.push("messaging.copy_approval_required");
  if (config.policies.approvalState !== "approved" || config.policies.refundPolicy === null || config.policies.digitalAccessPolicy === null || config.policies.fulfillmentPolicy === null) blockers.push("policies.owner_approval_required");
  if (config.catalog.shipping.approvalState !== "approved" || config.catalog.shipping.supportedCountries.length === 0 || config.catalog.shipping.addressRetentionDays === null) blockers.push("shipping.owner_approval_required");
  if (config.consent.approvalState !== "approved" || config.consent.checkboxCopy === null) blockers.push("consent.owner_approval_required");
  if (config.providers.dataPlane.status !== "provisioned") blockers.push("providers.neon_not_provisioned");
  if (config.providers.email.status !== "configured") blockers.push("providers.resend_not_configured");
  if (!config.cutover.platformActivationAllowed) blockers.push("cutover.platform_activation_closed");

  return {
    validForReview: errors.length === 0,
    activationReady: errors.length === 0 && blockers.length === 0,
    errors,
    blockers,
  };
}
