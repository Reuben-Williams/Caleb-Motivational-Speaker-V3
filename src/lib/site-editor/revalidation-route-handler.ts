import "server-only";

const PRIVATE_HEADERS = Object.freeze({ "Cache-Control": "private, no-store" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RevalidationStore {
  status(correlationId: string): Promise<"pending" | "complete" | "failed" | null>;
  retryFailedCommand(input: {
    targetCorrelationId: string;
    idempotencyKey: string;
    commandCorrelationId: string;
  }): Promise<Readonly<{
    status: "applied" | "replayed";
    revalidation: "pending";
    correlationId: string;
  }>>;
}

interface Runtime {
  authorizeRead(
    request: Request,
    operation: "website.preview.read",
  ): Promise<{ revalidation: RevalidationStore }>;
  authorizeMutation(
    request: Request,
    operation: "website.revalidation.retry",
    input: unknown,
  ): Promise<{
    grant: { correlationId: string };
    idempotencyKey: string;
    revalidation: RevalidationStore;
  }>;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

function safeError(error: unknown): Response {
  const status = error && typeof error === "object" && "status" in error &&
    typeof error.status === "number" ? error.status : 503;
  return json({
    code: status === 401 ? "authentication_required" :
      status === 403 ? "not_authorized" :
        status === 404 ? "not_found" :
          status === 409 ? "conflict" : "service_unavailable",
  }, [401, 403, 404, 409].includes(status) ? status : 503);
}

export function createCalebRevalidationRouteHandler(input: {
  resolveRuntime(): Promise<Runtime | null>;
}) {
  return async function calebRevalidationRoute(request: Request): Promise<Response> {
    const runtime = await input.resolveRuntime();
    if (!runtime) return json({ code: "service_unavailable" }, 503);
    try {
      if (request.method === "GET") {
        const url = new URL(request.url);
        const correlationId = url.searchParams.get("correlationId") ?? "";
        if ([...url.searchParams.keys()].length !== 1 || !UUID.test(correlationId)) {
          return json({ code: "invalid_request" }, 400);
        }
        const authorized = await runtime.authorizeRead(request, "website.preview.read");
        const status = await authorized.revalidation.status(correlationId);
        return status ? json({ revalidation: status }) : json({ code: "not_found" }, 404);
      }
      if (request.method !== "POST") return json({ code: "method_not_allowed" }, 405);
      const declared = Number(request.headers.get("content-length") ?? 0);
      if (declared > 16 * 1024) return json({ code: "payload_too_large" }, 413);
      const body = await request.json() as unknown;
      if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).sort().join(",") !== "action,correlationId" ||
        (body as Record<string, unknown>).action !== "retry" ||
        typeof (body as Record<string, unknown>).correlationId !== "string" ||
        !UUID.test((body as Record<string, unknown>).correlationId as string)) {
        return json({ code: "invalid_request" }, 400);
      }
      const typed = body as { action: "retry"; correlationId: string };
      const authorized = await runtime.authorizeMutation(
        request,
        "website.revalidation.retry",
        typed,
      );
      return json(await authorized.revalidation.retryFailedCommand({
        targetCorrelationId: typed.correlationId,
        idempotencyKey: authorized.idempotencyKey,
        commandCorrelationId: authorized.grant.correlationId,
      }));
    } catch (error) {
      return safeError(error);
    }
  };
}
