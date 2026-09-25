import "server-only";

import type { PostgresMediaStore } from "./media-store";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

interface Runtime {
  authorizeRead(request: Request, operation: "website.preview.read"): Promise<{ media: Pick<PostgresMediaStore, "list"> }>;
  authorizeMutation(request: Request, operation: "website.media.upload", input: unknown): Promise<{
    media: Pick<PostgresMediaStore, "upload">;
    idempotencyKey: string;
    grant: { correlationId: string };
  }>;
}

function isFile(value: FormDataEntryValue | null): value is File {
  if (!value || typeof value !== "object") return false;
  return "arrayBuffer" in value && typeof value.arrayBuffer === "function" &&
    "size" in value && typeof value.size === "number" &&
    "type" in value && typeof value.type === "string" &&
    "name" in value && typeof value.name === "string";
}

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

function safeError(error: unknown) {
  const status = error && typeof error === "object" && "httpStatus" in error && typeof error.httpStatus === "number"
    ? error.httpStatus
    : error && typeof error === "object" && "status" in error && typeof error.status === "number"
      ? error.status
      : 503;
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && error.code.startsWith("MEDIA_")
    ? error.code : status === 401 ? "authentication_required" : status === 403 ? "not_authorized" : "service_unavailable";
  return response({ code }, [400, 401, 403, 409, 413].includes(status) ? status : 503);
}

export function createCalebMediaRouteHandler(input: { resolveRuntime(): Promise<Runtime | null> }) {
  return async function mediaRoute(request: Request): Promise<Response> {
    const runtime = await input.resolveRuntime();
    if (!runtime) return response({ code: "service_unavailable" }, 503);
    try {
      if (request.method === "GET") {
        if (new URL(request.url).search) return response({ code: "invalid_request" }, 400);
        const authorized = await runtime.authorizeRead(request, "website.preview.read");
        return response({ assets: await authorized.media.list() });
      }
      if (request.method !== "POST") return response({ code: "method_not_allowed" }, 405);
      const form = await request.formData();
      const keys = [...form.keys()];
      if (keys.some((key) => !["file", "label", "alt", "regionId"].includes(key)) ||
        keys.some((key, index) => keys.indexOf(key) !== index)) {
        return response({ code: "invalid_request" }, 400);
      }
      const file = form.get("file");
      const label = form.get("label");
      const alt = form.get("alt");
      const regionId = form.get("regionId");
      if (!isFile(file) || typeof label !== "string" || typeof alt !== "string" ||
        (regionId !== null && typeof regionId !== "string")) {
        return response({ code: "invalid_request" }, 400);
      }
      const untrusted = { fileName: file.name, fileType: file.type, fileSize: file.size, label, alt, ...(regionId ? { regionId } : {}) };
      const authorized = await runtime.authorizeMutation(request, "website.media.upload", untrusted);
      return response(await authorized.media.upload({
        file, label, alt, ...(regionId ? { regionId } : {}),
        idempotencyKey: authorized.idempotencyKey,
        correlationId: authorized.grant.correlationId,
      }));
    } catch (error) {
      return safeError(error);
    }
  };
}
