import { describe, expect, it } from "vitest";

import { bookingSchema } from "@/lib/booking-schema";
import manifestFixture from "@/lib/inquiries/__fixtures__/highlevel/field-manifest.json";
import {
  HighLevelRequestError,
} from "@/lib/inquiries/highlevel-client";
import type {
  HighLevelContact,
  HighLevelOpportunity,
} from "@/lib/inquiries/highlevel-contract";
import { parseHighLevelFieldManifest } from "@/lib/inquiries/highlevel-field-manifest";
import {
  HighLevelGatewayError,
  HighLevelInquiryGateway,
  type HighLevelGatewayClient,
} from "@/lib/inquiries/highlevel-gateway";
import { validBooking } from "../../../tests/booking-fixture";

const manifest = parseHighLevelFieldManifest(JSON.stringify(manifestFixture));
const data = bookingSchema.parse(validBooking);

function contact(
  id: string,
  input: {
    email?: string | null;
    phone?: string | null;
    tags?: string[];
    customFields?: HighLevelContact["customFields"];
  } = {},
): HighLevelContact {
  return {
    id,
    locationId: "location-a",
    email: input.email,
    phone: input.phone,
    tags: input.tags ?? [],
    customFields: input.customFields ?? [],
  };
}

function opportunity(
  id: string,
  inquiryId: string,
): HighLevelOpportunity {
  return {
    id,
    name: "Synthetic Opportunity",
    pipelineId: "pipeline-a",
    pipelineStageId: "stage-a",
    contactId: "contact-a",
    locationId: "location-a",
    status: "open",
    source: "CalebJakesSpeaks.com",
    customFields: [
      { id: manifest.fields.websiteInquiryId.id, fieldValue: inquiryId },
    ],
  };
}

class FakeClient implements HighLevelGatewayClient {
  emailMatches: HighLevelContact[] = [];
  phoneMatches: HighLevelContact[] = [];
  opportunityMatches: HighLevelOpportunity[] = [];
  createdContact = contact("contact-created", {
    email: data.workEmail,
    phone: data.phone,
  });
  createdOpportunity = opportunity("opportunity-created", "CJ-ABCDEF123456");
  createContactCalls = 0;
  updateContactCalls = 0;
  createOpportunityCalls = 0;
  contactSearchCalls = 0;
  opportunitySearchCalls = 0;
  lastContactPayload: Record<string, unknown> | null = null;
  lastOpportunityPayload: Record<string, unknown> | null = null;
  createContactFailure: Error | null = null;
  updateContactFailure: Error | null = null;
  createOpportunityFailure: Error | null = null;

  async searchContacts(field: "email" | "phone") {
    this.contactSearchCalls += 1;
    return field === "email" ? this.emailMatches : this.phoneMatches;
  }

  async createContact(payload: Record<string, unknown>) {
    this.createContactCalls += 1;
    this.lastContactPayload = payload;
    if (this.createContactFailure) throw this.createContactFailure;
    this.emailMatches = [this.createdContact];
    this.phoneMatches = [this.createdContact];
    return this.createdContact;
  }

  async updateContact(
    contactId: string,
    payload: Record<string, unknown>,
  ) {
    this.updateContactCalls += 1;
    this.lastContactPayload = payload;
    if (this.updateContactFailure) throw this.updateContactFailure;
    return { ...contact(contactId), ...payload } as HighLevelContact;
  }

  async searchOpportunities() {
    this.opportunitySearchCalls += 1;
    return this.opportunityMatches;
  }

  async createOpportunity(payload: Record<string, unknown>) {
    this.createOpportunityCalls += 1;
    this.lastOpportunityPayload = payload;
    if (this.createOpportunityFailure) throw this.createOpportunityFailure;
    return this.createdOpportunity;
  }
}

function setup(client = new FakeClient()) {
  const gateway = new HighLevelInquiryGateway({
    client,
    manifest,
    locationId: "location-a",
    pipelineId: "pipeline-a",
    stageId: "stage-a",
  });
  return { client, gateway };
}

const signal = new AbortController().signal;

describe("HighLevel contact resolution", () => {
  it("creates and re-reads when email and phone have no matches", async () => {
    const { client, gateway } = setup();

    await expect(gateway.resolveContact(data, { signal })).resolves.toEqual({
      contactId: "contact-created",
    });
    expect(client.createContactCalls).toBe(1);
    expect(client.contactSearchCalls).toBe(4);
  });

  it("reuses one email match when phone has no match", async () => {
    const { client, gateway } = setup();
    client.emailMatches = [contact("contact-email", { email: data.workEmail })];

    await expect(gateway.resolveContact(data, { signal })).resolves.toEqual({
      contactId: "contact-email",
    });
    expect(client.createContactCalls).toBe(0);
    expect(client.updateContactCalls).toBe(1);
  });

  it("reuses one email and phone match only when they are the same contact", async () => {
    const same = new FakeClient();
    same.emailMatches = [contact("contact-same", { email: data.workEmail })];
    same.phoneMatches = [contact("contact-same", { phone: data.phone })];
    await expect(
      setup(same).gateway.resolveContact(data, { signal }),
    ).resolves.toEqual({ contactId: "contact-same" });

    const different = new FakeClient();
    different.emailMatches = [contact("contact-email")];
    different.phoneMatches = [contact("contact-phone")];
    await expect(
      setup(different).gateway.resolveContact(data, { signal }),
    ).rejects.toMatchObject({ code: "contact_conflict" });
    expect(different.updateContactCalls).toBe(0);
  });

  it("reuses a phone-only match only when its email is empty or equal", async () => {
    for (const email of [null, "", data.workEmail.toUpperCase()]) {
      const client = new FakeClient();
      client.phoneMatches = [contact("contact-phone", { email })];
      await expect(
        setup(client).gateway.resolveContact(data, { signal }),
      ).resolves.toEqual({ contactId: "contact-phone" });
    }

    const conflict = new FakeClient();
    conflict.phoneMatches = [
      contact("contact-phone", { email: "different@example.invalid" }),
    ];
    await expect(
      setup(conflict).gateway.resolveContact(data, { signal }),
    ).rejects.toMatchObject({ code: "contact_conflict" });
  });

  it("fails closed on multiple email or phone matches", async () => {
    for (const field of ["email", "phone"] as const) {
      const client = new FakeClient();
      client[`${field}Matches`] = [contact("one"), contact("two")];
      await expect(
        setup(client).gateway.resolveContact(data, { signal }),
      ).rejects.toBeInstanceOf(HighLevelGatewayError);
      expect(client.createContactCalls).toBe(0);
      expect(client.updateContactCalls).toBe(0);
    }
  });

  it("preserves unrelated tags and custom values while updating owned fields", async () => {
    const { client, gateway } = setup();
    client.emailMatches = [
      contact("contact-a", {
        email: data.workEmail,
        tags: ["existing-tag"],
        customFields: [
          { id: "unrelated-field", fieldValue: "keep-me" },
          { id: manifest.fields.contactRoleTitle.id, fieldValue: "Old Role" },
        ],
      }),
    ];

    await gateway.resolveContact(data, { signal });

    expect(client.lastContactPayload).toMatchObject({
      tags: [
        "existing-tag",
        "source:calebjakesspeaks.com",
        "intent:speaking-inquiry",
      ],
      customFields: [
        { id: "unrelated-field", fieldValue: "keep-me" },
        {
          id: manifest.fields.contactRoleTitle.id,
          fieldValue: data.roleTitle,
        },
      ],
    });
  });

  it("reruns exact resolution after a contact mutation conflict", async () => {
    const { client, gateway } = setup();
    client.emailMatches = [contact("contact-a", { email: data.workEmail })];
    client.updateContactFailure = new HighLevelRequestError({
      operation: "contact_update",
      code: "contact_update_conflict",
      status: 409,
      retryable: false,
    });

    await expect(gateway.resolveContact(data, { signal })).resolves.toEqual({
      contactId: "contact-a",
    });
    expect(client.contactSearchCalls).toBe(4);
    expect(client.updateContactCalls).toBe(1);
  });
});

describe("HighLevel opportunity recovery", () => {
  it("reuses one exact Website Inquiry ID and fails on multiple", async () => {
    const one = new FakeClient();
    one.opportunityMatches = [opportunity("opportunity-a", "CJ-ABCDEF123456")];
    await expect(
      setup(one).gateway.findOrCreateOpportunity({
        inquiryId: "CJ-ABCDEF123456",
        contactId: "contact-a",
        data,
      }),
    ).resolves.toEqual({ opportunityId: "opportunity-a" });
    expect(one.createOpportunityCalls).toBe(0);

    const multiple = new FakeClient();
    multiple.opportunityMatches = [
      opportunity("opportunity-a", "CJ-ABCDEF123456"),
      opportunity("opportunity-b", "CJ-ABCDEF123456"),
    ];
    await expect(
      setup(multiple).gateway.findOrCreateOpportunity({
        inquiryId: "CJ-ABCDEF123456",
        contactId: "contact-a",
        data,
      }),
    ).rejects.toMatchObject({ code: "opportunity_conflict" });
  });

  it("creates a complete opportunity when the inquiry ID is absent", async () => {
    const { client, gateway } = setup();

    await expect(
      gateway.findOrCreateOpportunity({
        inquiryId: "CJ-ABCDEF123456",
        contactId: "contact-a",
        data,
      }),
    ).resolves.toEqual({ opportunityId: "opportunity-created" });

    expect(client.lastOpportunityPayload).toMatchObject({
      name: "North Star College — Keynote — 2099-06-20",
      locationId: "location-a",
      pipelineId: "pipeline-a",
      pipelineStageId: "stage-a",
      contactId: "contact-a",
      status: "open",
      source: "CalebJakesSpeaks.com",
    });
    expect(client.lastOpportunityPayload).not.toHaveProperty("monetaryValue");
  });

  it("re-reads exact inquiry ID after a create conflict or timeout", async () => {
    for (const failure of [
      new HighLevelRequestError({
        operation: "opportunity_create",
        code: "opportunity_create_conflict",
        status: 409,
        retryable: false,
      }),
      new HighLevelRequestError({
        operation: "opportunity_create",
        code: "opportunity_create_timeout",
        status: 503,
        retryable: true,
      }),
    ]) {
      const client = new FakeClient();
      client.createOpportunityFailure = failure;
      client.searchOpportunities = async () => {
        client.opportunitySearchCalls += 1;
        return client.opportunitySearchCalls === 1
          ? []
          : [opportunity("opportunity-recovered", "CJ-ABCDEF123456")];
      };

      await expect(
        setup(client).gateway.findOrCreateOpportunity({
          inquiryId: "CJ-ABCDEF123456",
          contactId: "contact-a",
          data,
        }),
      ).resolves.toEqual({ opportunityId: "opportunity-recovered" });
    }
  });

  it("allows a distinct inquiry for the same contact to create another opportunity", async () => {
    const { client, gateway } = setup();
    client.opportunityMatches = [
      opportunity("opportunity-old", "CJ-OLDINQUIRY01"),
    ];

    await gateway.findOrCreateOpportunity({
      inquiryId: "CJ-NEWINQUIRY01",
      contactId: "contact-a",
      data,
    });

    expect(client.createOpportunityCalls).toBe(1);
  });
});
