import { z } from "zod";

type HighLevelObject = "contact" | "opportunity";

export type HighLevelManifestField = {
  id: string;
  key: string;
  object: HighLevelObject;
  dataType: string;
  options: string[];
};

const requirements = {
  contactRoleTitle: ["Role / Title", "contact", "TEXT", []],
  websiteInquiryId: ["Website Inquiry ID", "opportunity", "TEXT", []],
  organization: ["Organization", "opportunity", "TEXT", []],
  roleTitle: ["Role / Title", "opportunity", "TEXT", []],
  audienceType: [
    "Audience Type",
    "opportunity",
    "SINGLE_OPTIONS",
    [
      "schools-colleges",
      "faith-community",
      "conference-organization",
      "leadership-male-empowerment",
      "podcast-media",
      "other",
    ],
  ],
  audienceTypeOther: ["Other Audience Type", "opportunity", "TEXT", []],
  eventType: [
    "Event Type",
    "opportunity",
    "SINGLE_OPTIONS",
    [
      "keynote",
      "assembly",
      "faith-event",
      "leadership-seminar",
      "half-day-workshop",
      "full-day-workshop",
      "male-empowerment-event",
      "multi-session",
      "panel",
      "podcast-media",
      "other",
    ],
  ],
  eventTypeOther: ["Other Event Type", "opportunity", "TEXT", []],
  preferredDateStart: ["Preferred Start Date", "opportunity", "DATE", []],
  preferredDateEnd: ["Preferred End Date", "opportunity", "DATE", []],
  estimatedAudienceSize: [
    "Estimated Audience Size",
    "opportunity",
    "NUMERICAL",
    [],
  ],
  eventLocation: ["Event Location", "opportunity", "TEXT", []],
  attendanceMode: [
    "Attendance Mode",
    "opportunity",
    "SINGLE_OPTIONS",
    ["in-person", "virtual", "hybrid"],
  ],
  programLength: [
    "Program Length",
    "opportunity",
    "SINGLE_OPTIONS",
    [
      "under-45-min",
      "45-60-min",
      "60-90-min",
      "half-day",
      "full-day",
      "multi-session",
      "not-sure",
    ],
  ],
  eventGoals: ["Event Goals", "opportunity", "LARGE_TEXT", []],
  budgetRange: [
    "Budget Range",
    "opportunity",
    "SINGLE_OPTIONS",
    [
      "under-2500",
      "2500-4999",
      "5000-9999",
      "10000-plus",
      "not-sure",
      "prefer-not-to-say",
    ],
  ],
  referralSource: [
    "Referral Source",
    "opportunity",
    "SINGLE_OPTIONS",
    ["search", "social", "referral", "event", "podcast-media", "other"],
  ],
  referralSourceOther: [
    "Other Referral Source",
    "opportunity",
    "TEXT",
    [],
  ],
  additionalDetails: [
    "Additional Details",
    "opportunity",
    "LARGE_TEXT",
    [],
  ],
  privacyConsent: [
    "Privacy Consent Captured",
    "opportunity",
    "CHECKBOX",
    ["Yes - privacy consent captured"],
  ],
  utmSource: ["UTM Source", "opportunity", "TEXT", []],
  utmMedium: ["UTM Medium", "opportunity", "TEXT", []],
  utmCampaign: ["UTM Campaign", "opportunity", "TEXT", []],
  utmTerm: ["UTM Term", "opportunity", "TEXT", []],
  utmContent: ["UTM Content", "opportunity", "TEXT", []],
  referrerPath: ["Referrer Path", "opportunity", "TEXT", []],
} as const satisfies Record<
  string,
  readonly [string, HighLevelObject, string, readonly string[]]
>;

export type HighLevelFieldSemantic = keyof typeof requirements;
export type HighLevelFieldManifest = {
  version: 1;
  fields: Record<HighLevelFieldSemantic, HighLevelManifestField>;
};

const fieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  object: z.enum(["contact", "opportunity"]),
  dataType: z.string().min(1),
  options: z.array(z.string()),
});

export function parseHighLevelFieldManifest(
  json: string,
): HighLevelFieldManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("HighLevel field manifest JSON is invalid.");
  }
  if (
    !raw ||
    typeof raw !== "object" ||
    (raw as { version?: unknown }).version !== 1
  ) {
    throw new Error("HighLevel field manifest version is not supported.");
  }

  let parsed: { version: number; fields: Record<string, HighLevelManifestField> };
  try {
    parsed = z
      .object({
        version: z.number().int(),
        fields: z.record(z.string(), fieldSchema),
      })
      .parse(raw);
  } catch {
    throw new Error("HighLevel field manifest structure is invalid.");
  }

  const expectedKeys = Object.keys(requirements) as HighLevelFieldSemantic[];
  const actualKeys = Object.keys(parsed.fields);
  for (const semantic of expectedKeys) {
    const [label, object, dataType, options] = requirements[semantic];
    const field = parsed.fields[semantic];
    if (!field) {
      throw new Error(`HighLevel field manifest is missing ${label}.`);
    }
    if (
      field.object !== object ||
      field.dataType !== dataType ||
      JSON.stringify(field.options) !== JSON.stringify(options)
    ) {
      throw new Error(`HighLevel field manifest does not match ${label}.`);
    }
  }
  if (actualKeys.some((key) => !expectedKeys.includes(key as HighLevelFieldSemantic))) {
    throw new Error("HighLevel field manifest contains an unknown semantic field.");
  }

  const ids = expectedKeys.map((key) => parsed.fields[key]!.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("HighLevel field manifest contains a duplicate field ID.");
  }
  const keys = expectedKeys.map((key) => parsed.fields[key]!.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error("HighLevel field manifest contains a duplicate field key.");
  }

  return {
    version: 1,
    fields: parsed.fields as Record<
      HighLevelFieldSemantic,
      HighLevelManifestField
    >,
  };
}
