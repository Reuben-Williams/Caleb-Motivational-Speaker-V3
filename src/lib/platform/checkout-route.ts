import "server-only";

import type { CommerceEnvironment } from "./environment";
import { evaluateCheckoutRequest, type ApprovedOffer } from "./routing";

const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});
const MAX_BODY_BYTES = 4_096;

export function createCheckoutRoute(input: Readonly<{
  environment: CommerceEnvironment;
  createSession(offer: ApprovedOffer): Promise<Readonly<{
    id: string;
    url: string;
    livemode: boolean;
  }>>;
}>) {
  return async function checkoutRoute(request: Request): Promise<Response> {
    if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED");
    if (mediaType(request) !== "application/json") {
      return error(415, "UNSUPPORTED_MEDIA_TYPE");
    }

    let body: Record<string, unknown>;
    try {
      body = await readBody(request);
    } catch {
      return error(400, "INVALID_REQUEST");
    }

    const offerStableKey = body.offerStableKey;
    if (typeof offerStableKey !== "string" || offerStableKey.length > 120) {
      return error(400, "INVALID_REQUEST");
    }
    const browserFields = Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== "offerStableKey"),
    );
    const decision = evaluateCheckoutRequest({
      mode: input.environment.mode,
      configuredTestToken: input.environment.testAccessToken,
      suppliedTestToken: request.headers.get("x-platform-test-token"),
      offerStableKey,
      browserFields,
    });
    if (!decision.accepted) return decisionError(decision.reason);
    if (!input.environment.providersReady || !input.environment.runtimeEnabled) {
      return error(503, "CHECKOUT_SETUP_REQUIRED");
    }

    try {
      const session = await input.createSession(decision.offer);
      if (session.livemode || !/^cs_test_[A-Za-z0-9_]+$/.test(session.id)) {
        return error(503, "CHECKOUT_UNAVAILABLE");
      }
      const destination = new URL(session.url);
      if (destination.protocol !== "https:" || destination.hostname !== "checkout.stripe.com") {
        return error(503, "CHECKOUT_UNAVAILABLE");
      }
      return Response.json(
        { checkoutSessionId: session.id, url: destination.toString(), mode: "test" },
        { status: 201, headers: JSON_HEADERS },
      );
    } catch {
      return error(503, "CHECKOUT_UNAVAILABLE");
    }
  };
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new TypeError("Body too large.");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BODY_BYTES) throw new TypeError("Body too large.");
  const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("Object required.");
  }
  return parsed as Record<string, unknown>;
}

function mediaType(request: Request): string {
  return request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function decisionError(reason: string): Response {
  if (reason === "BROWSER_FIELDS_REJECTED") return error(400, reason);
  if (reason === "TEST_ACCESS_DENIED") return error(401, reason);
  if (reason === "OFFER_UNAVAILABLE") return error(409, reason);
  return error(404, reason);
}

function error(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status, headers: JSON_HEADERS });
}
