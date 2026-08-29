import { describe, expect, it, vi } from "vitest";

import contactsPage from "@/lib/inquiries/__fixtures__/highlevel/contacts-page.json";
import customFields from "@/lib/inquiries/__fixtures__/highlevel/custom-fields.json";
import opportunitiesPage from "@/lib/inquiries/__fixtures__/highlevel/opportunities-page.json";
import opportunityResponse from "@/lib/inquiries/__fixtures__/highlevel/opportunity-response.json";
import pipelines from "@/lib/inquiries/__fixtures__/highlevel/pipelines.json";
import {
  HighLevelClient,
  HighLevelRequestError,
} from "@/lib/inquiries/highlevel-client";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function setup(
  responses: Array<Response | Error>,
  diagnosticSink?: (diagnostic: Record<string, unknown>) => void,
) {
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
    void input;
    void init;
    const response = responses.shift();
    if (!response) throw new Error("No fake response configured.");
    if (response instanceof Error) throw response;
    return response;
    },
  );
  const sleeps: number[] = [];
  const client = new HighLevelClient({
    token: "server-only-token",
    locationId: "loc_fixture",
    fetch: fetchMock,
    timeoutMs: 10_000,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
    diagnosticSink,
  });
  return { client, fetchMock, sleeps };
}

describe("focused HighLevel v3 client", () => {
  it("sends server-only bearer and v3 headers with location-scoped contact search", async () => {
    const { client, fetchMock } = setup([jsonResponse(contactsPage)]);

    await client.searchContacts("email", "person@example.invalid");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://services.leadconnectorhq.com/contacts/search");
    expect(init).toMatchObject({ method: "POST" });
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer server-only-token",
    );
    expect(new Headers(init?.headers).get("version")).toBe("v3");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      locationId: "loc_fixture",
      page: 1,
      pageLimit: 100,
      filters: [
        {
          field: "email",
          operator: "eq",
          value: "person@example.invalid",
        },
      ],
    });
  });

  it("fully pages contact search before returning", async () => {
    const first = structuredClone(contactsPage);
    first.total = 2;
    const second = structuredClone(contactsPage);
    second.contacts[0]!.id = "contact_fixture_2";
    second.total = 2;
    const { client, fetchMock } = setup([
      jsonResponse(first),
      jsonResponse(second),
    ]);

    const contacts = await client.searchContacts(
      "email",
      "person@example.invalid",
    );

    expect(contacts.map(({ id }) => id)).toEqual([
      "contact_fixture",
      "contact_fixture_2",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]?.body)).page).toBe(2);
  });

  it("fully pages contact/pipeline opportunities using provider cursors", async () => {
    const first = structuredClone(opportunitiesPage);
    first.meta.total = 2;
    first.meta.nextPageUrl =
      "https://services.leadconnectorhq.com/opportunities/search?locationId=loc_fixture&startAfterId=opportunity_fixture&startAfter=1";
    const second = structuredClone(opportunitiesPage);
    second.opportunities[0]!.id = "opportunity_fixture_2";
    second.meta.total = 2;
    second.meta.nextPageUrl = "";
    const { client, fetchMock } = setup([
      jsonResponse(first),
      jsonResponse(second),
    ]);

    const opportunities = await client.searchOpportunities({
      contactId: "contact_fixture",
      pipelineId: "pipeline_fixture",
    });

    expect(opportunities).toHaveLength(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain(
      "locationId=loc_fixture",
    );
    expect(String(fetchMock.mock.calls[0]![0])).toContain(
      "contactId=contact_fixture",
    );
    expect(String(fetchMock.mock.calls[1]![0])).toContain(
      "startAfterId=opportunity_fixture",
    );
  });

  it("strictly parses create/get and inventory responses", async () => {
    const { client } = setup([
      jsonResponse({ contact: contactsPage.contacts[0] }, 201),
      jsonResponse(opportunityResponse, 201),
      jsonResponse(opportunityResponse),
      jsonResponse(pipelines),
      jsonResponse(customFields),
    ]);

    await expect(
      client.createContact({
        name: "Synthetic",
        email: "person@example.invalid",
      }),
    ).resolves.toMatchObject({ id: "contact_fixture" });
    await expect(
      client.createOpportunity({ fixture: true }),
    ).resolves.toMatchObject({ id: "opportunity_fixture" });
    await expect(
      client.getOpportunity("opportunity_fixture"),
    ).resolves.toMatchObject({ id: "opportunity_fixture" });
    await expect(client.listPipelines()).resolves.toHaveLength(1);
    await expect(client.listCustomFields()).resolves.toHaveLength(2);
  });

  it("rejects a successful response that violates the provider contract", async () => {
    const { client } = setup([jsonResponse({ contacts: "invalid" })]);

    await expect(
      client.searchContacts("email", "person@example.invalid"),
    ).rejects.toMatchObject({
      name: "HighLevelRequestError",
      code: "contact_search_contract",
      status: 502,
    });
  });

  it("retries eligible 429, 5xx, and transport failures at most twice", async () => {
    const { client, fetchMock, sleeps } = setup([
      jsonResponse({ message: "rate limited with private details" }, 429, {
        "retry-after": "1",
      }),
      new Error("socket included private request data"),
      jsonResponse(pipelines),
    ]);

    await expect(client.listPipelines()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([1_000, 500]);
  });

  it.each([401, 403, 422])(
    "does not retry ordinary provider status %s",
    async (status) => {
      const { client, fetchMock } = setup([
        jsonResponse({ message: "private provider body" }, status),
      ]);

      await expect(client.listPipelines()).rejects.toBeInstanceOf(
        HighLevelRequestError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("classifies operation-specific conflicts without exposing provider bodies", async () => {
    const { client } = setup([
      jsonResponse(
        { message: "conflict includes person@example.invalid" },
        409,
      ),
    ]);

    let error: unknown;
    try {
      await client.createContact({ email: "person@example.invalid" });
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      name: "HighLevelRequestError",
      code: "contact_create_conflict",
      status: 409,
      retryable: false,
    });
    expect(JSON.stringify(error)).not.toContain("person@example.invalid");
    expect(JSON.stringify(error)).not.toContain("private provider body");
  });

  it("reports provider failures without logging request or response data", async () => {
    const diagnostics: Array<Record<string, unknown>> = [];
    const { client } = setup(
      [jsonResponse({ message: "private person@example.invalid" }, 422)],
      (diagnostic) => diagnostics.push(diagnostic),
    );

    await expect(client.createOpportunity({ private: "payload" })).rejects.toBeInstanceOf(
      HighLevelRequestError,
    );
    expect(diagnostics).toEqual([
      {
        operation: "opportunity_create",
        code: "opportunity_create_rejected",
        status: 422,
        retryable: false,
      },
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain("person@example.invalid");
    expect(JSON.stringify(diagnostics)).not.toContain("payload");
  });

  it("attaches an abort signal and keeps each timeout below the contact lease", async () => {
    const { client, fetchMock } = setup([jsonResponse(pipelines)]);

    await client.listPipelines();

    const signal = fetchMock.mock.calls[0]![1]?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(client.timeoutMs).toBe(10_000);
    expect(client.timeoutMs).toBeLessThan(75_000);
  });
});
