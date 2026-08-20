import "server-only";

import { parseCheckoutStatus } from "./status";

const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});

export function createCheckoutStatusRoute(input: Readonly<{
  enabled: boolean;
  lookup(checkoutSessionId: string): Promise<unknown>;
}>) {
  return async function checkoutStatusRoute(request: Request): Promise<Response> {
    if (request.method !== "GET") return error(405, "METHOD_NOT_ALLOWED");
    const checkoutSessionId = new URL(request.url).searchParams.get("checkout_session_id") ?? "";
    if (!/^cs_test_[A-Za-z0-9_]{1,200}$/.test(checkoutSessionId)) {
      return error(400, "INVALID_CHECKOUT_REFERENCE");
    }
    if (!input.enabled) return error(503, "STATUS_RUNTIME_NOT_READY");
    try {
      return Response.json(parseCheckoutStatus(await input.lookup(checkoutSessionId)), {
        status: 200,
        headers: JSON_HEADERS,
      });
    } catch {
      return error(503, "STATUS_UNAVAILABLE");
    }
  };
}

function error(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status, headers: JSON_HEADERS });
}
