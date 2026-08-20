import { deepFreeze } from "./immutability";
import type { CalebCommerceConfig, MessageTemplate } from "./types";

const transactional = (
  index: number,
  stableKey: string,
  subject: string,
  body: string,
  variableKeys: string[],
): MessageTemplate => ({
  templateId: `c3010000-0000-4000-8000-00000000000${index}`,
  revisionId: `c3020000-0000-4000-8000-00000000000${index}`,
  stableKey,
  purpose: "transactional",
  subject,
  body,
  variableKeys,
  linkDestinations: stableKey === "caleb-book-order-confirmed" ? [] : ["{{library_url}}"],
  state: "draft",
  approvalState: "awaiting_caleb",
});

const campaign = (index: number): MessageTemplate => ({
  templateId: `c3030000-0000-4000-8000-00000000000${index}`,
  revisionId: `c3040000-0000-4000-8000-00000000000${index}`,
  stableKey: `caleb-book-nurture-${index + 1}`,
  purpose: "marketing",
  subject: `Caleb follow-up ${index + 1} — owner approval required`,
  body: "Owner-approved message content will be inserted before activation. {{unsubscribe_url}} {{business_mailing_address}}",
  variableKeys: ["unsubscribe_url", "business_mailing_address"],
  linkDestinations: [],
  state: "draft",
  approvalState: "awaiting_caleb",
});

export const TEMPLATES: CalebCommerceConfig["templates"] = deepFreeze({
  transactional: [
    transactional(
      1,
      "caleb-book-order-confirmed",
      "Your book order is confirmed — owner approval required",
      "Hi {{customer_name}}, we received order {{order_number}}. The physical book will be prepared through the manual fulfillment queue. Questions can be sent to {{support_email}}.",
      ["customer_name", "order_number", "support_email"],
    ),
    transactional(
      2,
      "caleb-audiobook-access",
      "Your audiobook access — owner approval required",
      "Hi {{customer_name}}, your audiobook is available in your private customer library: {{library_url}}. Questions can be sent to {{support_email}}.",
      ["customer_name", "library_url", "support_email"],
    ),
    transactional(
      3,
      "caleb-course-access",
      "Your course access — owner approval required",
      "Hi {{customer_name}}, your course is available in your private customer library: {{library_url}}. Questions can be sent to {{support_email}}.",
      ["customer_name", "library_url", "support_email"],
    ),
    transactional(
      4,
      "caleb-workbook-access",
      "Your workbook access — owner approval required",
      "Hi {{customer_name}}, your workbook is available in your private customer library: {{library_url}}. Questions can be sent to {{support_email}}.",
      ["customer_name", "library_url", "support_email"],
    ),
  ],
  campaign: [1, 2, 3, 4, 5, 6].map(campaign),
});
