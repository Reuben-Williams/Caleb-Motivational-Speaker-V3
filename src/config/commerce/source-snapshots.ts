import { canonicalSha256, deepFreeze } from "./immutability";
import type { CalebRecipeKey, SourceSnapshot, SourceStep } from "./types";

const COMMON_SETTINGS = {
  allowReentry: true,
  allowMultipleOpportunities: true,
  stopOnResponse: false,
  sendingTimeRestrictions: false,
  clickTracking: false,
  utmTracking: false,
  tagOnInteraction: false,
  templateSynchronization: false,
  markConversationRead: false,
  timezoneSource: "highlevel_account",
  senderSource: "highlevel_default",
} as const;

const LAST_OBSERVED_AT = "2026-08-19T23:04:51.000Z";
const CAPTURED_AT = "2026-08-20T15:44:59.751Z";
const EVIDENCE_PATH = "docs/evidence/highlevel-commerce-workflow-audit-2026-08-19.md";

function snapshot(input: {
  snapshotId: string;
  recipeKey: CalebRecipeKey;
  externalWorkflowId: string;
  sourceName: string;
  triggers: Array<Record<string, string | number | boolean>>;
  steps: SourceStep[];
  findings: SourceSnapshot["findings"];
}): SourceSnapshot {
  const normalized = {
    triggers: input.triggers,
    steps: input.steps,
    settings: { ...COMMON_SETTINGS },
  };
  return deepFreeze({
    version: 1,
    snapshotId: input.snapshotId,
    recipeKey: input.recipeKey,
    providerKey: "highlevel",
    providerDisplayName: "HighLevel",
    locationId: "2FqgdrmWP252v43cX5RY",
    externalWorkflowId: input.externalWorkflowId,
    sourceName: input.sourceName,
    sourceStatus: "published",
    lastObservedAt: LAST_OBSERVED_AT,
    observationTimePrecision: "bounded_by_design_record",
    capturedAt: CAPTURED_AT,
    normalized,
    contentDigest: canonicalSha256(normalized),
    evidencePath: EVIDENCE_PATH,
    sanitizedSourceUrl: `https://app.gohighlevel.com/v2/location/2FqgdrmWP252v43cX5RY/automation/workflow/${input.externalWorkflowId}`,
    findings: input.findings,
    executable: false,
  });
}

export const SOURCE_SNAPSHOTS: SourceSnapshot[] = deepFreeze([
  snapshot({
    snapshotId: "c1100000-0000-4000-8000-000000000001",
    recipeKey: "caleb.book_purchased.v1",
    externalWorkflowId: "b98d2b26-6631-4504-ae99-de8df7985f46",
    sourceName: "01. Book Funnel: Shedding Pounds Gaining Purpose",
    triggers: [
      { type: "order_form_submission", funnel: "The Weighty Joy of Surrender", page: "Optin", product: "print_book" },
      { type: "order_submitted", product: "print_book", observedPriceMinor: 995, currency: "USD" },
    ],
    steps: [
      { key: "add-status-tag", type: "tag.add", tagPurpose: "book_funnel_status" },
      { key: "send-confirmation", type: "email.send", subject: "Your Book is On the Way" },
      { key: "wait-one-minute", type: "delay", delayMinutes: 1 },
      {
        key: "infer-audiobook-upsell",
        type: "branch",
        conditionSummary: "book-funnel tag plus active membership in Workflow 03",
        branchOutcomes: ["add_print_plus_audio_tags", "add_print_only_tag"],
      },
      { key: "wait-five-minutes", type: "delay", delayMinutes: 5 },
      { key: "add-start-nurture-tag", type: "tag.add", tagPurpose: "start_nurture" },
    ],
    findings: [
      { code: "tag_based_product_inference", severity: "critical", message: "Audiobook ownership is inferred from tags and another active workflow." },
      { code: "source_price_not_approved", severity: "warning", message: "The observed 9.95 USD entry is source evidence, not an approved platform price." },
    ],
  }),
  snapshot({
    snapshotId: "c1100000-0000-4000-8000-000000000002",
    recipeKey: "caleb.book_nurture.v1",
    externalWorkflowId: "031d3e0c-2402-4f15-b3f0-f99d0bfd5877",
    sourceName: "02. Funnel Nurture Sequence",
    triggers: [
      { type: "order_form_submission", product: "print_book" },
      { type: "tag_added", tagPurpose: "start_nurture" },
      { type: "order_submitted", product: "print_book" },
    ],
    steps: [
      { key: "wait-six-hours", type: "delay", delayMinutes: 360 },
      { key: "send-email-2", type: "email.send", subject: "Elevate Your Brand Presence: Unleash the Power of Social Media Management" },
      { key: "wait-one-day-1", type: "delay", delayMinutes: 1_440 },
      { key: "send-email-3", type: "email.send", subject: "Elevate Your Brand Presence: Unleash the Power of Social Media Management" },
      { key: "wait-two-days", type: "delay", delayMinutes: 2_880 },
      { key: "send-course-email-4", type: "email.send", subject: "Elevate Your Brand Presence: Unleash the Power of Social Media Management", linkDestinationKind: "highlevel_preview_url", exactLinkCaptured: false },
      { key: "wait-one-day-2", type: "delay", delayMinutes: 1_440 },
      { key: "send-course-email-5", type: "email.send", subject: "Elevate Your Brand Presence: Unleash the Power of Social Media Management", linkDestinationKind: "highlevel_preview_url", exactLinkCaptured: false },
      { key: "wait-one-day-3", type: "delay", delayMinutes: 1_440 },
      { key: "send-course-email-6", type: "email.send", subject: "Elevate Your Brand Presence: Unleash the Power of Social Media Management", linkDestinationKind: "highlevel_preview_url", exactLinkCaptured: false, urgencyClaims: ["closing_soon", "limited_spots"] },
      { key: "wait-one-day-4", type: "delay", delayMinutes: 1_440 },
      { key: "send-course-email-7", type: "email.send", subject: "Elevate Your Brand Presence: Unleash the Power of Social Media Management", linkDestinationKind: "highlevel_preview_url", exactLinkCaptured: false, urgencyClaims: ["closing_soon", "midnight"] },
      { key: "wait-final-day", type: "delay", delayMinutes: 1_440 },
      { key: "remove-status-tag", type: "tag.remove", tagPurpose: "book_funnel_status" },
    ],
    findings: [
      { code: "unrelated_subject", severity: "critical", message: "All six subjects refer to social media management rather than Caleb's book or course." },
      { code: "preview_links", severity: "critical", message: "Course emails use HighLevel preview destinations rather than approved production routes." },
      { code: "unsupported_urgency", severity: "critical", message: "Closing and midnight urgency has no observed deadline contract." },
    ],
  }),
  snapshot({
    snapshotId: "c1100000-0000-4000-8000-000000000003",
    recipeKey: "caleb.audiobook_purchased.v1",
    externalWorkflowId: "c19691ab-f433-446c-acba-56ca723f4661",
    sourceName: "03. Audiobook Purchase",
    triggers: [{ type: "order_submitted", product: "audiobook" }],
    steps: [
      { key: "send-audiobook-access", type: "email.send", linkDestinationKind: "google_drive_share", exactLinkCaptured: false },
      { key: "wait-twelve-hours", type: "delay", delayMinutes: 720 },
    ],
    findings: [
      { code: "public_share_link", severity: "critical", message: "Access uses a Google Drive share destination rather than entitlement-gated private storage." },
      { code: "implementation_signal_wait", severity: "warning", message: "The 12-hour wait exists only to support cross-workflow inference." },
      { code: "source_subject_unknown", severity: "warning", message: "The exact source email subject was not retained in the sanitized audit." },
    ],
  }),
  snapshot({
    snapshotId: "c1100000-0000-4000-8000-000000000004",
    recipeKey: "caleb.course_purchased.v1",
    externalWorkflowId: "554540ac-901e-4844-8009-bc0040c8b76f",
    sourceName: "04. Course Purchase",
    triggers: [
      { type: "order_form_submission", product: "course", placement: "upsell" },
      { type: "order_submitted", product: "course" },
    ],
    steps: [
      { key: "grant-course-offer", type: "offer.grant", offerName: "Release The Weight Course" },
      { key: "add-course-tag", type: "tag.add", tagPurpose: "course_purchase" },
      { key: "wait-one-minute", type: "delay", delayMinutes: 1 },
      { key: "send-membership-login", type: "email.send", linkDestinationKind: "membership_login_variable", variable: "{{membership_contact.login_url}}" },
    ],
    findings: [
      { code: "provider_specific_entitlement", severity: "warning", message: "The source offer grant and login variable are HighLevel-specific." },
      { code: "source_subject_unknown", severity: "warning", message: "The exact source email subject was not retained in the sanitized audit." },
    ],
  }),
  snapshot({
    snapshotId: "c1100000-0000-4000-8000-000000000005",
    recipeKey: "caleb.workbook_purchased.v1",
    externalWorkflowId: "798ae811-426a-46c3-87a2-6a56013e541d",
    sourceName: "05. Workbook Purchase",
    triggers: [{ type: "order_form_submission", product: "workbook", placement: "downsell" }],
    steps: [
      { key: "send-workbook-access", type: "email.send", linkDestinationKind: "google_drive_share", exactLinkCaptured: false },
    ],
    findings: [
      { code: "public_share_link", severity: "critical", message: "Access uses a Google Drive share destination rather than entitlement-gated private storage." },
      { code: "source_tag_absent", severity: "info", message: "No workbook purchase tag was observed and none will be invented." },
      { code: "source_subject_unknown", severity: "warning", message: "The exact source email subject was not retained in the sanitized audit." },
    ],
  }),
]);
