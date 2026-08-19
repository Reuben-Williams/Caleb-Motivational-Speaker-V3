import type { BookingData } from "@/lib/booking-schema";
import {
  HighLevelRequestError,
} from "@/lib/inquiries/highlevel-client";
import type {
  HighLevelContact,
  HighLevelOpportunity,
} from "@/lib/inquiries/highlevel-contract";
import type { HighLevelFieldManifest } from "@/lib/inquiries/highlevel-field-manifest";
import {
  mapHighLevelContact,
  mapHighLevelOpportunity,
} from "@/lib/inquiries/highlevel-mapping";
import type { InquiryGateway } from "@/lib/inquiries/service";

export interface HighLevelGatewayClient {
  searchContacts(
    field: "email" | "phone",
    value: string,
    signal?: AbortSignal,
  ): Promise<HighLevelContact[]>;
  createContact(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HighLevelContact>;
  updateContact(
    contactId: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HighLevelContact>;
  searchOpportunities(
    input: { contactId: string; pipelineId: string },
    signal?: AbortSignal,
  ): Promise<HighLevelOpportunity[]>;
  createOpportunity(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HighLevelOpportunity>;
}

type GatewayOptions = {
  client: HighLevelGatewayClient;
  manifest: HighLevelFieldManifest;
  locationId: string;
  pipelineId: string;
  stageId: string;
};

export class HighLevelGatewayError extends Error {
  readonly code: "contact_conflict" | "opportunity_conflict";

  constructor(code: "contact_conflict" | "opportunity_conflict") {
    super("HighLevel inquiry gateway conflict.");
    this.name = "HighLevelGatewayError";
    this.code = code;
  }
}

function normalizedEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isMutationConflict(error: unknown) {
  return error instanceof HighLevelRequestError && error.status === 409;
}

export class HighLevelInquiryGateway implements InquiryGateway {
  private readonly client: HighLevelGatewayClient;
  private readonly manifest: HighLevelFieldManifest;
  private readonly locationId: string;
  private readonly pipelineId: string;
  private readonly stageId: string;

  constructor({
    client,
    manifest,
    locationId,
    pipelineId,
    stageId,
  }: GatewayOptions) {
    this.client = client;
    this.manifest = manifest;
    this.locationId = locationId;
    this.pipelineId = pipelineId;
    this.stageId = stageId;
  }

  async resolveContact(
    data: BookingData,
    { signal }: { signal: AbortSignal },
  ): Promise<{ contactId: string }> {
    const resolved = await this.findExactContact(data, signal);
    if (!resolved) {
      try {
        await this.client.createContact(
          mapHighLevelContact(data, this.manifest),
          signal,
        );
      } catch (error) {
        if (!isMutationConflict(error)) throw error;
      }

      const reread = await this.findExactContact(data, signal);
      if (!reread) throw new HighLevelGatewayError("contact_conflict");
      await this.updateOwnedContact(reread, data, signal, true);
      return { contactId: reread.id };
    }

    await this.updateOwnedContact(resolved, data, signal, true);
    return { contactId: resolved.id };
  }

  async findOrCreateOpportunity(input: {
    inquiryId: string;
    contactId: string;
    data: BookingData;
  }): Promise<{ opportunityId: string }> {
    const existing = await this.findExactOpportunity(
      input.contactId,
      input.inquiryId,
    );
    if (existing) return { opportunityId: existing.id };

    try {
      const created = await this.client.createOpportunity(
        mapHighLevelOpportunity(
          {
            ...input,
            locationId: this.locationId,
            pipelineId: this.pipelineId,
            stageId: this.stageId,
          },
          this.manifest,
        ),
      );
      return { opportunityId: created.id };
    } catch (error) {
      if (!this.shouldRecoverOpportunityCreate(error)) throw error;
      const recovered = await this.findExactOpportunity(
        input.contactId,
        input.inquiryId,
      );
      if (!recovered) throw error;
      return { opportunityId: recovered.id };
    }
  }

  private async findExactContact(
    data: BookingData,
    signal: AbortSignal,
  ): Promise<HighLevelContact | null> {
    const [emailMatches, phoneMatches] = await Promise.all([
      this.client.searchContacts("email", data.workEmail, signal),
      this.client.searchContacts("phone", data.phone, signal),
    ]);
    if (emailMatches.length > 1 || phoneMatches.length > 1) {
      throw new HighLevelGatewayError("contact_conflict");
    }

    const email = emailMatches[0];
    const phone = phoneMatches[0];
    if (email && phone && email.id !== phone.id) {
      throw new HighLevelGatewayError("contact_conflict");
    }
    if (email) return email;
    if (!phone) return null;

    const phoneEmail = normalizedEmail(phone.email);
    if (
      phoneEmail &&
      phoneEmail !== normalizedEmail(data.workEmail)
    ) {
      throw new HighLevelGatewayError("contact_conflict");
    }
    return phone;
  }

  private async updateOwnedContact(
    contact: HighLevelContact,
    data: BookingData,
    signal: AbortSignal,
    recoverConflict: boolean,
  ) {
    const owned = mapHighLevelContact(data, this.manifest);
    const roleFieldId = this.manifest.fields.contactRoleTitle.id;
    const payload = {
      ...owned,
      tags: [...new Set([...contact.tags, ...owned.tags])],
      customFields: [
        ...contact.customFields.filter(({ id }) => id !== roleFieldId),
        ...owned.customFields,
      ],
    };
    try {
      await this.client.updateContact(contact.id, payload, signal);
    } catch (error) {
      if (!recoverConflict || !isMutationConflict(error)) throw error;
      const reread = await this.findExactContact(data, signal);
      if (!reread) throw new HighLevelGatewayError("contact_conflict");
    }
  }

  private async findExactOpportunity(
    contactId: string,
    inquiryId: string,
  ): Promise<HighLevelOpportunity | null> {
    const opportunities = await this.client.searchOpportunities({
      contactId,
      pipelineId: this.pipelineId,
    });
    const fieldId = this.manifest.fields.websiteInquiryId.id;
    const exact = opportunities.filter((opportunity) =>
      opportunity.customFields.some(
        (field) =>
          field.id === fieldId && String(field.fieldValue) === inquiryId,
      ),
    );
    if (exact.length > 1) {
      throw new HighLevelGatewayError("opportunity_conflict");
    }
    return exact[0] ?? null;
  }

  private shouldRecoverOpportunityCreate(error: unknown) {
    return (
      error instanceof HighLevelRequestError &&
      (error.status === 409 ||
        error.code.endsWith("_timeout") ||
        error.code.endsWith("_transport"))
    );
  }
}
