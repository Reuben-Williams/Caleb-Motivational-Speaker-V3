import "server-only";

import { timingSafeEqual } from "node:crypto";

const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});
const MAX_WORKER_BODY_BYTES = 4_096;

export function createProviderWebhookBoundary(input: Readonly<{
  enabled: boolean;
  handle(request: Request): Promise<Response>;
}>) {
  return async function providerWebhookBoundary(request: Request): Promise<Response> {
    if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED");
    if (!input.enabled) return error(503, "PROVIDER_RUNTIME_NOT_READY");
    return input.handle(request);
  };
}

export function createWorkerBoundary(input: Readonly<{
  secret: string | null;
  enabled: boolean;
  handle(request: Request): Promise<Response>;
}>) {
  return async function workerBoundary(request: Request): Promise<Response> {
    if (request.method !== "POST") return error(405, "METHOD_NOT_ALLOWED");
    if (!authorized(request.headers.get("authorization"), input.secret)) {
      return error(401, "WORKER_UNAUTHORIZED");
    }
    if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
      return error(415, "UNSUPPORTED_MEDIA_TYPE");
    }
    try {
      const clone = request.clone();
      const contentLength = Number(clone.headers.get("content-length") ?? 0);
      if (Number.isFinite(contentLength) && contentLength > MAX_WORKER_BODY_BYTES) {
        return error(413, "BODY_TOO_LARGE");
      }
      const body = await clone.text();
      if (body.length > MAX_WORKER_BODY_BYTES) return error(413, "BODY_TOO_LARGE");
      if (body) JSON.parse(body);
    } catch {
      return error(400, "INVALID_REQUEST");
    }
    if (!input.enabled) return error(503, "WORKER_RUNTIME_NOT_READY");
    return input.handle(request);
  };
}

function authorized(header: string | null, secret: string | null): boolean {
  if (!header?.startsWith("Bearer ") || !secret || secret.length < 32) return false;
  const supplied = header.slice("Bearer ".length);
  if (supplied.length < 32) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function error(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status, headers: JSON_HEADERS });
}
