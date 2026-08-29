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
  type HighLevelContact,
  type HighLevelCustomField,
  type HighLevelOpportunity,
  type HighLevelPipeline,
} from "@/lib/inquiries/highlevel-contract";

const DEFAULT_BASE_URL = "https://services.leadconnectorhq.com";
const MAX_RETRIES = 2;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type ProviderDiagnostic = {
  operation: RequestOperation;
  code: string;
  status: number;
  retryable: boolean;
};

type ProviderDiagnosticSink = (diagnostic: ProviderDiagnostic) => void;

type ClientOptions = {
  token: string;
  locationId: string;
  fetch?: FetchLike;
  baseUrl?: string;
  timeoutMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  diagnosticSink?: ProviderDiagnosticSink;
};

type RequestOperation =
  | "location_read"
  | "contact_search"
  | "contact_create"
  | "contact_update"
  | "opportunity_search"
  | "opportunity_create"
  | "opportunity_get"
  | "pipeline_list"
  | "custom_field_list";

export class HighLevelRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly operation: RequestOperation;

  constructor(input: {
    code: string;
    status: number;
    retryable: boolean;
    operation: RequestOperation;
  }) {
    super("HighLevel request failed.");
    this.name = "HighLevelRequestError";
    this.code = input.code;
    this.status = input.status;
    this.retryable = input.retryable;
    this.operation = input.operation;
  }
}

export class HighLevelClient {
  readonly locationId: string;
  readonly timeoutMs: number;
  private readonly token: string;
  private readonly fetch: FetchLike;
  private readonly baseUrl: string;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly diagnosticSink: ProviderDiagnosticSink;

  constructor({
    token,
    locationId,
    fetch: fetchImplementation = globalThis.fetch,
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = 20_000,
    sleep = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
    diagnosticSink = (diagnostic) =>
      console.error("HighLevel request failed", diagnostic),
  }: ClientOptions) {
    if (!token.trim() || !locationId.trim()) {
      throw new Error("HighLevel client configuration is incomplete.");
    }
    if (timeoutMs <= 0 || timeoutMs >= 75_000) {
      throw new Error("HighLevel request timeout is outside the safe budget.");
    }
    this.token = token;
    this.locationId = locationId;
    this.fetch = fetchImplementation;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
    this.sleep = sleep;
    this.diagnosticSink = diagnosticSink;
  }

  async readLocation(signal?: AbortSignal) {
    return this.request(
      "location_read",
      HIGHLEVEL_ENDPOINTS.location(this.locationId),
      { method: "GET", signal },
      parseLocationResponse,
    );
  }

  async searchContacts(
    field: "email" | "phone",
    value: string,
    signal?: AbortSignal,
  ): Promise<HighLevelContact[]> {
    const contacts: HighLevelContact[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;
    while (contacts.length < total) {
      const result = await this.request(
        "contact_search",
        HIGHLEVEL_ENDPOINTS.contactsSearch,
        {
          method: "POST",
          signal,
          body: JSON.stringify({
            locationId: this.locationId,
            page,
            pageLimit: 100,
            filters: [{ field, operator: "eq", value }],
          }),
        },
        parseContactSearchResponse,
      );
      contacts.push(...result.contacts);
      total = result.total;
      if (result.contacts.length === 0) break;
      page += 1;
    }
    return contacts;
  }

  async createContact(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HighLevelContact> {
    return this.request(
      "contact_create",
      "/contacts/",
      { method: "POST", body: JSON.stringify({ ...payload, locationId: this.locationId }), signal },
      parseContactResponse,
    );
  }

  async updateContact(
    contactId: string,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HighLevelContact> {
    return this.request(
      "contact_update",
      HIGHLEVEL_ENDPOINTS.contact(contactId),
      { method: "PUT", body: JSON.stringify(payload), signal },
      parseContactResponse,
    );
  }

  async searchOpportunities(
    input: { contactId: string; pipelineId: string },
    signal?: AbortSignal,
  ): Promise<HighLevelOpportunity[]> {
    const initial = new URL(HIGHLEVEL_ENDPOINTS.opportunitiesSearch, this.baseUrl);
    initial.searchParams.set("locationId", this.locationId);
    initial.searchParams.set("contactId", input.contactId);
    initial.searchParams.set("pipelineId", input.pipelineId);
    initial.searchParams.set("limit", "100");

    const opportunities: HighLevelOpportunity[] = [];
    let nextUrl: string | null = initial.toString();
    while (nextUrl) {
      const safeUrl = this.safeProviderPaginationUrl(nextUrl);
      const result = await this.request(
        "opportunity_search",
        safeUrl,
        { method: "GET", signal },
        parseOpportunitySearchResponse,
      );
      opportunities.push(...result.opportunities);
      if (opportunities.length >= result.meta.total) break;
      nextUrl = result.meta.nextPageUrl?.trim() || null;
      if (!nextUrl && result.opportunities.length > 0) {
        const fallback = new URL(initial);
        if (result.meta.startAfterId) {
          fallback.searchParams.set("startAfterId", result.meta.startAfterId);
        }
        if (result.meta.startAfter !== undefined && result.meta.startAfter !== null) {
          fallback.searchParams.set("startAfter", String(result.meta.startAfter));
        }
        nextUrl = fallback.toString();
      }
      if (result.opportunities.length === 0) break;
    }
    return opportunities;
  }

  async createOpportunity(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HighLevelOpportunity> {
    return this.request(
      "opportunity_create",
      HIGHLEVEL_ENDPOINTS.opportunities,
      { method: "POST", body: JSON.stringify(payload), signal },
      parseOpportunityResponse,
    );
  }

  async getOpportunity(
    opportunityId: string,
    signal?: AbortSignal,
  ): Promise<HighLevelOpportunity> {
    return this.request(
      "opportunity_get",
      HIGHLEVEL_ENDPOINTS.opportunity(opportunityId),
      { method: "GET", signal },
      parseOpportunityResponse,
    );
  }

  async listPipelines(signal?: AbortSignal): Promise<HighLevelPipeline[]> {
    const url = new URL(HIGHLEVEL_ENDPOINTS.pipelines, this.baseUrl);
    url.searchParams.set("locationId", this.locationId);
    const result = await this.request(
      "pipeline_list",
      url.toString(),
      { method: "GET", signal },
      parsePipelinesResponse,
    );
    return result.pipelines;
  }

  async listCustomFields(
    signal?: AbortSignal,
  ): Promise<HighLevelCustomField[]> {
    const url = new URL(
      HIGHLEVEL_ENDPOINTS.customFields(this.locationId),
      this.baseUrl,
    );
    url.searchParams.set("model", "all");
    const result = await this.request(
      "custom_field_list",
      url.toString(),
      { method: "GET", signal },
      parseCustomFieldsResponse,
    );
    return result.customFields;
  }

  private safeProviderPaginationUrl(value: string): string {
    const url = new URL(value, this.baseUrl);
    const base = new URL(this.baseUrl);
    if (
      url.origin !== base.origin ||
      url.pathname !== HIGHLEVEL_ENDPOINTS.opportunitiesSearch
    ) {
      throw new HighLevelRequestError({
        operation: "opportunity_search",
        code: "opportunity_search_contract",
        status: 502,
        retryable: false,
      });
    }
    return url.toString();
  }

  private async request<T>(
    operation: RequestOperation,
    pathOrUrl: string,
    init: RequestInit,
    parse: (input: unknown) => T,
  ): Promise<T> {
    const url = new URL(pathOrUrl, this.baseUrl).toString();
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const externalSignal = init.signal;
      const abortFromExternal = () => controller.abort();
      externalSignal?.addEventListener("abort", abortFromExternal, {
        once: true,
      });
      try {
        const response = await this.fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.token}`,
            Version: HIGHLEVEL_API_VERSION,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
          },
        });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          if (retryable && attempt < MAX_RETRIES) {
            await this.sleep(this.retryDelay(response, attempt));
            continue;
          }
          const failure = this.responseError(
            operation,
            response.status,
            retryable,
          );
          this.diagnosticSink({
            operation: failure.operation,
            code: failure.code,
            status: failure.status,
            retryable: failure.retryable,
          });
          throw failure;
        }

        let body: unknown;
        try {
          body = await response.json();
          return parse(body);
        } catch {
          throw new HighLevelRequestError({
            operation,
            code: `${operation}_contract`,
            status: 502,
            retryable: false,
          });
        }
      } catch (error) {
        if (error instanceof HighLevelRequestError) throw error;
        if (attempt < MAX_RETRIES && !externalSignal?.aborted) {
          await this.sleep(250 * (attempt + 1));
          continue;
        }
        throw new HighLevelRequestError({
          operation,
          code: controller.signal.aborted
            ? `${operation}_timeout`
            : `${operation}_transport`,
          status: 503,
          retryable: true,
        });
      } finally {
        clearTimeout(timeout);
        externalSignal?.removeEventListener("abort", abortFromExternal);
      }
    }
    throw new HighLevelRequestError({
      operation,
      code: `${operation}_transport`,
      status: 503,
      retryable: true,
    });
  }

  private retryDelay(response: Response, attempt: number) {
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        return Math.min(2_000, retryAfter * 1_000);
      }
    }
    return 250 * (attempt + 1);
  }

  private responseError(
    operation: RequestOperation,
    status: number,
    retryable: boolean,
  ) {
    return new HighLevelRequestError({
      operation,
      status,
      retryable,
      code:
        status === 409
          ? `${operation}_conflict`
          : status === 401 || status === 403
            ? `${operation}_unauthorized`
            : status === 429
              ? `${operation}_rate_limited`
              : status >= 500
                ? `${operation}_unavailable`
                : `${operation}_rejected`,
    });
  }
}
