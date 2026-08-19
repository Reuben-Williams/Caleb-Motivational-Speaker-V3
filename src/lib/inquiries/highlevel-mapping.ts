import type { BookingData } from "@/lib/booking-schema";
import type { HighLevelFieldManifest } from "@/lib/inquiries/highlevel-field-manifest";

const SOURCE = "CalebJakesSpeaks.com";
const TAGS = [
  "source:calebjakesspeaks.com",
  "intent:speaking-inquiry",
] as const;

const eventTypeLabels: Record<BookingData["eventType"], string> = {
  keynote: "Keynote",
  assembly: "Assembly",
  "faith-event": "Faith Event",
  "leadership-seminar": "Leadership Seminar",
  "half-day-workshop": "Half-Day Workshop",
  "full-day-workshop": "Full-Day Workshop",
  "male-empowerment-event": "Male Empowerment Event",
  "multi-session": "Multi-Session",
  panel: "Panel",
  "podcast-media": "Podcast / Media",
  other: "Other",
};

type CustomFieldValue = {
  id: string;
  fieldValue: string | number | boolean;
};

export function mapHighLevelContact(
  data: BookingData,
  manifest: HighLevelFieldManifest,
) {
  return {
    name: data.fullName,
    email: data.workEmail,
    phone: data.phone,
    companyName: data.organization,
    source: SOURCE,
    tags: [...TAGS],
    customFields: [
      {
        id: manifest.fields.contactRoleTitle.id,
        fieldValue: data.roleTitle,
      },
    ],
  };
}

export function mapHighLevelOpportunity(
  input: {
    inquiryId: string;
    contactId: string;
    locationId: string;
    pipelineId: string;
    stageId: string;
    data: BookingData;
  },
  manifest: HighLevelFieldManifest,
) {
  const { data } = input;
  const fieldValues: Array<
    readonly [keyof HighLevelFieldManifest["fields"], string | number | boolean]
  > = [
    ["websiteInquiryId", input.inquiryId],
    ["organization", data.organization],
    ["roleTitle", data.roleTitle],
    ["audienceType", data.audienceType],
    ["audienceTypeOther", data.audienceTypeOther],
    ["eventType", data.eventType],
    ["eventTypeOther", data.eventTypeOther],
    ["preferredDateStart", data.preferredDateStart],
    ["preferredDateEnd", data.preferredDateEnd],
    ["estimatedAudienceSize", data.estimatedAudienceSize],
    ["eventLocation", data.eventLocation],
    ["attendanceMode", data.attendanceMode],
    ["programLength", data.programLength],
    ["eventGoals", data.eventGoals],
    ["budgetRange", data.budgetRange],
    ["referralSource", data.referralSource],
    ["referralSourceOther", data.referralSourceOther],
    ["additionalDetails", data.additionalDetails],
    ["privacyConsent", data.consent],
    ["utmSource", data.utmSource],
    ["utmMedium", data.utmMedium],
    ["utmCampaign", data.utmCampaign],
    ["utmTerm", data.utmTerm],
    ["utmContent", data.utmContent],
    ["referrerPath", data.referrerPath],
  ];
  const customFields: CustomFieldValue[] = fieldValues.map(
    ([semantic, fieldValue]) => ({
      id: manifest.fields[semantic].id,
      fieldValue,
    }),
  );
  const eventType =
    data.eventType === "other" && data.eventTypeOther
      ? data.eventTypeOther
      : eventTypeLabels[data.eventType];

  return {
    name: `${data.organization} — ${eventType} — ${data.preferredDateStart}`,
    pipelineId: input.pipelineId,
    locationId: input.locationId,
    pipelineStageId: input.stageId,
    status: "open" as const,
    source: SOURCE,
    contactId: input.contactId,
    customFields,
  };
}
