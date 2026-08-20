import "server-only";

const COOKIE_NAME = "__Host-builder_customer";
const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});

export function readCustomerSessionToken(cookieHeader: string | null): string | null {
  const values = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (values.length !== 1) return null;
  const token = values[0]!.slice(COOKIE_NAME.length + 1);
  return token.length >= 32 && token.length <= 512 ? token : null;
}

export function createCustomerRuntimeBoundary(input: Readonly<{
  enabled: boolean;
  handle(request: Request): Promise<Response>;
}>) {
  return async function customerRuntimeBoundary(request: Request): Promise<Response> {
    if (!input.enabled) return error(503, "CUSTOMER_ACCESS_NOT_READY");
    return input.handle(request);
  };
}

export function createPrivateAssetBoundary(input: Readonly<{
  enabled: boolean;
  handle(request: Request, assetId: string, sessionToken: string): Promise<Response>;
}>) {
  return async function privateAssetBoundary(
    request: Request,
    assetId: string,
  ): Promise<Response> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) {
      return error(404, "ASSET_NOT_FOUND");
    }
    const sessionToken = readCustomerSessionToken(request.headers.get("cookie"));
    if (!sessionToken) return error(401, "CUSTOMER_AUTH_REQUIRED");
    if (!input.enabled) return error(503, "CUSTOMER_ACCESS_NOT_READY");
    return input.handle(request, assetId, sessionToken);
  };
}

export function customerAccessError(status: number, code: string): Response {
  return error(status, code);
}

function error(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status, headers: JSON_HEADERS });
}
