import { z } from "zod";

export const HIGHLEVEL_API_VERSION = "v3";

export const HIGHLEVEL_ENDPOINTS = {
  location: (locationId: string) => `/locations/${locationId}`,
  contactsSearch: "/contacts/search",
  contact: (contactId: string) => `/contacts/${contactId}`,
  opportunitiesSearch: "/opportunities/search",
  opportunities: "/opportunities/",
  opportunity: (opportunityId: string) => `/opportunities/${opportunityId}`,
  pipelines: "/opportunities/pipelines",
  customFields: (locationId: string) =>
    `/locations/${locationId}/customFields`,
} as const;

const customValueSchema = z.union([
  z.object({
    id: z.string().min(1),
    key: z.string().min(1).optional(),
    fieldValue: z.unknown(),
  }),
  z
    .object({
      id: z.string().min(1),
      key: z.string().min(1).optional(),
      value: z.unknown(),
    })
    .transform(({ value, ...field }) => ({ ...field, fieldValue: value })),
]);

const contactSchema = z.object({
  id: z.string().min(1),
  locationId: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.array(customValueSchema).default([]),
});

const opportunitySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  pipelineId: z.string().min(1),
  pipelineStageId: z.string().min(1),
  contactId: z.string().min(1),
  locationId: z.string().min(1),
  status: z.enum(["open", "won", "lost", "abandoned"]),
  source: z.string().nullable().optional(),
  monetaryValue: z.number().nullable().optional(),
  externalObjectId: z.string().nullable().optional(),
  customFields: z.array(customValueSchema).default([]),
});

const opportunityMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  nextPageUrl: z.string().nullable().optional(),
  startAfterId: z.string().nullable().optional(),
  startAfter: z.number().nullable().optional(),
  currentPage: z.number().int().positive().optional(),
  nextPage: z.string().nullable().optional(),
  prevPage: z.string().nullable().optional(),
});

const pipelineStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: z.number(),
});

const pipelineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  locationId: z.string().min(1),
  stages: z.array(pipelineStageSchema),
});

const customFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  model: z.enum(["contact", "opportunity"]),
  fieldKey: z.string().min(1),
  dataType: z.string().min(1),
  position: z.number(),
  picklistOptions: z.array(z.string()).default([]),
  locationId: z.string().min(1),
});

export type HighLevelContact = z.infer<typeof contactSchema>;
export type HighLevelOpportunity = z.infer<typeof opportunitySchema>;
export type HighLevelPipeline = z.infer<typeof pipelineSchema>;
export type HighLevelCustomField = z.infer<typeof customFieldSchema>;

export function parseLocationResponse(input: unknown) {
  const parsed = z
    .object({
      location: z.object({
        id: z.string().min(1),
        settings: z.object({
          allowDuplicateContact: z.boolean(),
          allowDuplicateOpportunity: z.boolean(),
        }),
      }),
    })
    .parse(input);

  return {
    locationId: parsed.location.id,
    ...parsed.location.settings,
  };
}

export function parseContactSearchResponse(input: unknown) {
  return z
    .object({
      contacts: z.array(contactSchema),
      total: z.number().int().nonnegative(),
    })
    .parse(input);
}

export function parseContactResponse(input: unknown): HighLevelContact {
  return z.object({ contact: contactSchema }).parse(input).contact;
}

export function parseOpportunitySearchResponse(input: unknown) {
  return z
    .object({
      opportunities: z.array(opportunitySchema),
      meta: opportunityMetaSchema,
    })
    .parse(input);
}

export function parseOpportunityResponse(
  input: unknown,
): HighLevelOpportunity {
  return z.object({ opportunity: opportunitySchema }).parse(input).opportunity;
}

export function parsePipelinesResponse(input: unknown) {
  return z.object({ pipelines: z.array(pipelineSchema) }).parse(input);
}

export function parseCustomFieldsResponse(input: unknown) {
  return z.object({ customFields: z.array(customFieldSchema) }).parse(input);
}
