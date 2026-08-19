import { describe, expect, it } from "vitest";

import { bookingSchema } from "@/lib/booking-schema";
import manifestFixture from "@/lib/inquiries/__fixtures__/highlevel/field-manifest.json";
import { parseHighLevelFieldManifest } from "@/lib/inquiries/highlevel-field-manifest";
import {
  mapHighLevelContact,
  mapHighLevelOpportunity,
} from "@/lib/inquiries/highlevel-mapping";
import { validBooking } from "../../../tests/booking-fixture";

const manifest = parseHighLevelFieldManifest(JSON.stringify(manifestFixture));
const booking = bookingSchema.parse(validBooking);

describe("HighLevel inquiry mapping", () => {
  it("maps only owned contact fields and exact source/intent tags", () => {
    expect(mapHighLevelContact(booking, manifest)).toEqual({
      name: "Jordan Avery",
      email: "jordan@example.org",
      phone: "(404) 555-0199",
      companyName: "North Star College",
      source: "CalebJakesSpeaks.com",
      tags: [
        "source:calebjakesspeaks.com",
        "intent:speaking-inquiry",
      ],
      customFields: [
        { id: "cf_contact_role", fieldValue: "Director of Student Life" },
      ],
    });
  });

  it("maps every event field without an artificial monetary value", () => {
    const result = mapHighLevelOpportunity(
      {
        inquiryId: "CJ-ABCDEF123456",
        contactId: "contact-a",
        locationId: "location-a",
        pipelineId: "pipeline-a",
        stageId: "stage-a",
        data: booking,
      },
      manifest,
    );

    expect(result).toMatchObject({
      name: "North Star College — Keynote — 2099-06-20",
      contactId: "contact-a",
      locationId: "location-a",
      pipelineId: "pipeline-a",
      pipelineStageId: "stage-a",
      status: "open",
      source: "CalebJakesSpeaks.com",
    });
    expect(result).not.toHaveProperty("monetaryValue");
    expect(result.customFields).toHaveLength(25);
    expect(result.customFields).toContainEqual({
      id: "cf_inquiry_id",
      fieldValue: "CJ-ABCDEF123456",
    });
    expect(result.customFields).toContainEqual({
      id: "cf_audience_size",
      fieldValue: 450,
    });
    expect(result.customFields).toContainEqual({
      id: "cf_consent",
      fieldValue: true,
    });
  });

  it("keeps empty optional values empty", () => {
    const result = mapHighLevelOpportunity(
      {
        inquiryId: "CJ-ABCDEF123456",
        contactId: "contact-a",
        locationId: "location-a",
        pipelineId: "pipeline-a",
        stageId: "stage-a",
        data: booking,
      },
      manifest,
    );

    expect(result.customFields).toContainEqual({
      id: "cf_additional",
      fieldValue: "",
    });
    expect(result.customFields).toContainEqual({
      id: "cf_utm_source",
      fieldValue: "",
    });
  });
});
