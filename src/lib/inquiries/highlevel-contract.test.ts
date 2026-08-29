import { describe, expect, it } from "vitest";

import contactResponse from "@/lib/inquiries/__fixtures__/highlevel/contact-response.json";
import contactsPage from "@/lib/inquiries/__fixtures__/highlevel/contacts-page.json";
import customFields from "@/lib/inquiries/__fixtures__/highlevel/custom-fields.json";
import location from "@/lib/inquiries/__fixtures__/highlevel/location.json";
import opportunitiesPage from "@/lib/inquiries/__fixtures__/highlevel/opportunities-page.json";
import opportunityResponse from "@/lib/inquiries/__fixtures__/highlevel/opportunity-response.json";
import pipelines from "@/lib/inquiries/__fixtures__/highlevel/pipelines.json";
import {
  HIGHLEVEL_API_VERSION,
  HIGHLEVEL_ENDPOINTS,
  parseContactResponse,
  parseContactSearchResponse,
  parseCustomFieldsResponse,
  parseLocationResponse,
  parseOpportunityResponse,
  parseOpportunitySearchResponse,
  parsePipelinesResponse,
} from "@/lib/inquiries/highlevel-contract";

describe("HighLevel v3 provider contract", () => {
  it("pins the validated API version and endpoint paths", () => {
    expect(HIGHLEVEL_API_VERSION).toBe("v3");
    expect(HIGHLEVEL_ENDPOINTS.contactsSearch).toBe("/contacts/search");
    expect(HIGHLEVEL_ENDPOINTS.opportunitiesSearch).toBe(
      "/opportunities/search",
    );
    expect(HIGHLEVEL_ENDPOINTS.opportunities).toBe("/opportunities/");
    expect(HIGHLEVEL_ENDPOINTS.pipelines).toBe("/opportunities/pipelines");
    expect(HIGHLEVEL_ENDPOINTS.location("loc_fixture")).toBe(
      "/locations/loc_fixture",
    );
    expect(HIGHLEVEL_ENDPOINTS.contact("contact_fixture")).toBe(
      "/contacts/contact_fixture",
    );
    expect(HIGHLEVEL_ENDPOINTS.opportunity("opportunity_fixture")).toBe(
      "/opportunities/opportunity_fixture",
    );
    expect(HIGHLEVEL_ENDPOINTS.customFields("loc_fixture")).toBe(
      "/locations/loc_fixture/customFields",
    );
  });

  it("parses location duplicate settings", () => {
    expect(parseLocationResponse(location)).toEqual({
      locationId: "loc_fixture",
      allowDuplicateContact: false,
      allowDuplicateOpportunity: true,
    });
  });

  it("parses exact-contact search and contact mutation responses", () => {
    expect(parseContactSearchResponse(contactsPage)).toMatchObject({
      total: 1,
      contacts: [{ id: "contact_fixture", locationId: "loc_fixture" }],
    });
    expect(parseContactResponse(contactResponse).id).toBe("contact_fixture");
  });

  it("normalizes legacy contact custom-field values without losing data", () => {
    const parsed = parseContactResponse({
      contact: {
        ...contactResponse.contact,
        customFields: [{ id: "legacy_field", value: "keep-me" }],
      },
    });

    expect(parsed.customFields).toEqual([
      { id: "legacy_field", fieldValue: "keep-me" },
    ]);
  });

  it("parses paginated opportunity responses and preserves custom fields", () => {
    const parsed = parseOpportunitySearchResponse(opportunitiesPage);

    expect(parsed.meta).toMatchObject({ total: 1, currentPage: 1 });
    expect(parsed.opportunities[0]).toMatchObject({
      id: "opportunity_fixture",
      contactId: "contact_fixture",
      customFields: [
        { id: "field_fixture", fieldValue: "inquiry_fixture" },
      ],
    });
    expect(parseOpportunityResponse(opportunityResponse).id).toBe(
      "opportunity_fixture",
    );
  });

  it("normalizes typed opportunity-search custom-field values", () => {
    const typed = {
      ...opportunitiesPage,
      opportunities: [
        {
          ...opportunitiesPage.opportunities[0],
          customFields: [
            {
              id: "string_field",
              type: "string",
              fieldValueString: "CJ-ABCDEF123456",
            },
            {
              id: "number_field",
              type: "number",
              fieldValueNumber: 125,
            },
            {
              id: "date_field",
              type: "date",
              fieldValueDate: "2099-06-20",
            },
            {
              id: "array_field",
              type: "array",
              fieldValueArray: ["approved"],
            },
          ],
        },
      ],
    };

    expect(
      parseOpportunitySearchResponse(typed).opportunities[0]?.customFields,
    ).toEqual([
      { id: "string_field", fieldValue: "CJ-ABCDEF123456" },
      { id: "number_field", fieldValue: 125 },
      { id: "date_field", fieldValue: "2099-06-20" },
      { id: "array_field", fieldValue: ["approved"] },
    ]);
  });

  it("parses pipeline stages and contact/opportunity field inventories", () => {
    expect(parsePipelinesResponse(pipelines).pipelines[0]?.stages[0]).toEqual({
      id: "stage_fixture",
      name: "Synthetic Stage",
      position: 0,
    });
    expect(parseCustomFieldsResponse(customFields).customFields).toEqual([
      expect.objectContaining({
        id: "contact_field_fixture",
        model: "contact",
        dataType: "TEXT",
        picklistOptions: [],
      }),
      expect.objectContaining({
        id: "opportunity_field_fixture",
        model: "opportunity",
        dataType: "SINGLE_OPTIONS",
        picklistOptions: ["fixture-a", "fixture-b"],
      }),
    ]);
  });

  it.each([
    ["location", () => parseLocationResponse({ location: {} })],
    ["contacts", () => parseContactSearchResponse({ contacts: "invalid" })],
    [
      "opportunities",
      () => parseOpportunitySearchResponse({ opportunities: [] }),
    ],
    ["pipelines", () => parsePipelinesResponse({ pipelines: [{}] })],
    ["custom fields", () => parseCustomFieldsResponse({ customFields: [{}] })],
    ["contact mutation", () => parseContactResponse({ contact: {} })],
    [
      "opportunity mutation",
      () => parseOpportunityResponse({ opportunity: {} }),
    ],
  ])("rejects a malformed %s response", (_label, parse) => {
    expect(parse).toThrow();
  });
});
