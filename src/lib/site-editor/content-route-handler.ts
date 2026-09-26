import "server-only";

import type { CalebPostgresContentAdapter } from "./postgres-content-adapter";
import type { PostgresMediaStore } from "./media-store";
import { getCalebSeedMedia } from "./media-seed-catalog";
import { websiteSecurityErrorCode } from "./security-error";
import { notifyCalebContentCommitted } from "./revalidation-kickoff";

const PRIVATE_HEADERS = Object.freeze({ "Cache-Control": "private, no-store" });
const MAX_JSON_BYTES = 64 * 1024;

interface WebsiteGrant {
  siteId: string;
  subject: string;
  correlationId: string;
}

interface AuthorizedRead {
  grant: WebsiteGrant;
  adapter: Pick<
    CalebPostgresContentAdapter,
    "getContentState" | "listVersions" | "listAuditLog"
  >;
}

interface AuthorizedMutation {
  grant: WebsiteGrant;
  adapter: Pick<
    CalebPostgresContentAdapter,
    "saveDraftCommand" | "publishCommand" | "rollbackCommand" | "undoRollbackCommand"
  >;
  media: Pick<PostgresMediaStore, "delivery">;
  idempotencyKey: string;
  replay: boolean;
}

interface ContentRuntime {
  authorizeRead(
    request: Request,
    operation: "website.preview.read" | "website.history.read",
  ): Promise<AuthorizedRead>;
  authorizeMutation(
    request: Request,
    operation: "website.draft.save" | "website.publish" | "website.rollback",
    input: unknown,
  ): Promise<AuthorizedMutation>;
}

function response(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

function safeError(error: unknown): Response {
  // Emit only bounded machine codes, never exception messages or request data.
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string" &&
    /^[A-Z0-9_]{2,64}$/.test(error.code)) {
    console.warn("website_content_command_failed", { code: error.code });
  } else {
    console.warn("website_content_command_failed", { code: error instanceof TypeError ? "INVALID_SHAPE" : "UNCLASSIFIED" });
  }
  if (websiteSecurityErrorCode(error)) return response({ code: "security_verification_required" }, 403);
  if (error && typeof error === "object") {
    const status = "httpStatus" in error && typeof error.httpStatus === "number"
      ? error.httpStatus
      : "status" in error && typeof error.status === "number"
        ? error.status
        : 503;
    const code = "code" in error && typeof error.code === "string"
      ? error.code
      : status === 401
        ? "authentication_required"
        : status === 403
          ? "not_authorized"
          : "service_unavailable";
    const allowedCode = code.startsWith("CONTENT_") ? code :
      status === 401 ? "authentication_required" :
        status === 403 ? "not_authorized" :
          status === 409 ? "conflict" : "service_unavailable";
    return response({ code: allowedCode }, [400, 401, 403, 404, 409, 413].includes(status) ? status : 503);
  }
  return response({ code: "service_unavailable" }, 503);
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function nullableId(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0);
}

async function jsonBody(request: Request): Promise<Record<string, unknown> | Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    return response({ code: "payload_too_large" }, 413);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ code: "invalid_request" }, 400);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    return response({ code: "payload_too_large" }, 413);
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return record(parsed) ? parsed : response({ code: "invalid_request" }, 400);
  } catch {
    return response({ code: "invalid_request" }, 400);
  }
}

function exactSearch(url: URL, keys: readonly string[]): boolean {
  const actual = [...url.searchParams.keys()].sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function createCalebContentRouteHandler(input: {
  resolveRuntime(): Promise<ContentRuntime | null>;
  onCommitted?: () => void;
}) {
  return async function calebContentRoute(request: Request): Promise<Response> {
    const runtime = await input.resolveRuntime();
    if (!runtime) return response({ code: "service_unavailable" }, 503);
    try {
      if (request.method === "GET") {
        const url = new URL(request.url);
        const pagePath = url.searchParams.get("path");
        if (!pagePath) return response({ code: "invalid_request" }, 400);
        if (url.searchParams.get("mode") === "draft" && exactSearch(url, ["path", "mode"])) {
          const authorized = await runtime.authorizeRead(request, "website.preview.read");
          return response(await authorized.adapter.getContentState(pagePath));
        }
        if (url.searchParams.get("resource") === "history" && exactSearch(url, ["path", "resource"])) {
          const authorized = await runtime.authorizeRead(request, "website.history.read");
          const [versions, audit] = await Promise.all([
            authorized.adapter.listVersions(pagePath),
            authorized.adapter.listAuditLog(authorized.grant.siteId, pagePath),
          ]);
          return response({ versions, audit });
        }
        return response({ code: "invalid_request" }, 400);
      }

      if (request.method !== "POST" && request.method !== "PUT" && request.method !== "PATCH") {
        return response({ code: "method_not_allowed" }, 405);
      }
      const body = await jsonBody(request);
      if (body instanceof Response) return body;

      if (request.method === "POST") {
        if (!exactKeys(body, ["action", "pagePath", "regionId", "value", "expectedDraftVersionId"]) ||
          body.action !== "saveDraft" || typeof body.pagePath !== "string" ||
          typeof body.regionId !== "string" || !nullableId(body.expectedDraftVersionId)) {
          return response({ code: "invalid_request" }, 400);
        }
        const authorized = await runtime.authorizeMutation(request, "website.draft.save", body);
        if (body.value && typeof body.value === "object" && !Array.isArray(body.value) &&
          "type" in body.value && body.value.type === "image") {
          const mediaId = "mediaId" in body.value && typeof body.value.mediaId === "string" ? body.value.mediaId : "";
          if (!getCalebSeedMedia(mediaId) && !await authorized.media.delivery(mediaId)) {
            return response({ code: "CONTENT_MEDIA_NOT_FOUND" }, 400);
          }
        }
        return response(await authorized.adapter.saveDraftCommand({
          pagePath: body.pagePath,
          regionId: body.regionId,
          value: body.value,
          expectedDraftVersionId: body.expectedDraftVersionId,
          idempotencyKey: authorized.idempotencyKey,
          correlationId: authorized.grant.correlationId,
        }));
      }

      if (request.method === "PUT") {
        if (!exactKeys(body, ["pagePath", "expectedDraftVersionId", "expectedPublishedVersionId"]) ||
          typeof body.pagePath !== "string" || !nullableId(body.expectedDraftVersionId) ||
          !nullableId(body.expectedPublishedVersionId)) {
          return response({ code: "invalid_request" }, 400);
        }
        const authorized = await runtime.authorizeMutation(request, "website.publish", body);
        const result = await authorized.adapter.publishCommand({
          pagePath: body.pagePath,
          expectedDraftVersionId: body.expectedDraftVersionId,
          expectedPublishedVersionId: body.expectedPublishedVersionId,
          idempotencyKey: authorized.idempotencyKey,
          correlationId: authorized.grant.correlationId,
        });
        notifyCalebContentCommitted(input.onCommitted);
        return response(result);
      }

      if (body.action === "rollback") {
        if (!exactKeys(body, ["action", "pagePath", "versionId", "expectedPublishedVersionId"]) ||
          typeof body.pagePath !== "string" || typeof body.versionId !== "string" ||
          !nullableId(body.expectedPublishedVersionId)) {
          return response({ code: "invalid_request" }, 400);
        }
        const authorized = await runtime.authorizeMutation(request, "website.rollback", body);
        const result = await authorized.adapter.rollbackCommand({
          pagePath: body.pagePath,
          versionId: body.versionId,
          expectedPublishedVersionId: body.expectedPublishedVersionId,
          idempotencyKey: authorized.idempotencyKey,
          correlationId: authorized.grant.correlationId,
        });
        notifyCalebContentCommitted(input.onCommitted);
        return response(result);
      }
      if (body.action === "undoRollback") {
        if (!exactKeys(body, ["action", "pagePath", "rollbackVersionId", "expectedPublishedVersionId"]) ||
          typeof body.pagePath !== "string" || typeof body.rollbackVersionId !== "string" ||
          !nullableId(body.expectedPublishedVersionId)) {
          return response({ code: "invalid_request" }, 400);
        }
        const authorized = await runtime.authorizeMutation(request, "website.rollback", body);
        const result = await authorized.adapter.undoRollbackCommand({
          pagePath: body.pagePath,
          rollbackVersionId: body.rollbackVersionId,
          expectedPublishedVersionId: body.expectedPublishedVersionId,
          idempotencyKey: authorized.idempotencyKey,
          correlationId: authorized.grant.correlationId,
        });
        notifyCalebContentCommitted(input.onCommitted);
        return response(result);
      }
      return response({ code: "invalid_request" }, 400);
    } catch (error) {
      return safeError(error);
    }
  };
}
