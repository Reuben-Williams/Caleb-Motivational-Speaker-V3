import { cookies } from "next/headers";

import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { createCalebStaffRuntime } from "@/lib/staff/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

function safeError(error: unknown) {
  const status =
    error && typeof error === "object" && "status" in error &&
    (error.status === 401 || error.status === 403 || error.status === 409)
      ? error.status
      : 503;
  return Response.json(
    { code: status === 401 ? "authentication_required" : status === 403 ? "not_authorized" : status === 409 ? "conflict" : "service_unavailable" },
    { status, headers: privateHeaders },
  );
}

async function staffRuntime() {
  const store = await cookies();
  return createCalebStaffRuntime(process.env, nextCookieAdapter(store));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ leadId: string }> },
) {
  const configured = await staffRuntime();
  if (!configured) return safeError(null);
  try {
    const authorized = await configured.authorizeRead(request, [
      "leads.read",
      "messages.read",
    ]);
    const { leadId } = await context.params;
    const lead = await authorized.repository.get(leadId);
    if (!lead) {
      return Response.json({ code: "not_found" }, { status: 404, headers: privateHeaders });
    }
    return Response.json({ lead }, { headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ leadId: string }> },
) {
  const configured = await staffRuntime();
  if (!configured) return safeError(null);
  try {
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > 16 * 1024) {
      return Response.json({ code: "payload_too_large" }, { status: 413, headers: privateHeaders });
    }
    const body = await request.json() as Record<string, unknown>;
    const { leadId } = await context.params;
    if (body.action === "change_status") {
      const authorized = await configured.authorizeMutation(request, "leads.update", body);
      const result = await authorized.repository.changeStatus({
        leadId,
        expectedVersion: Number(body.expectedVersion),
        status: body.status as "new" | "contacted" | "qualified" | "won" | "lost" | "spam",
        occurredAt: new Date().toISOString(),
      });
      if (result.status === "conflict") {
        return Response.json({ code: "conflict" }, { status: 409, headers: privateHeaders });
      }
      return Response.json({ code: "updated", version: result.version }, { headers: privateHeaders });
    }
    if (body.action === "add_activity") {
      const authorized = await configured.authorizeMutation(request, "tasks.manage", body);
      await authorized.repository.addActivity({
        leadId,
        kind: body.kind as "note" | "task",
        body: String(body.body ?? ""),
        occurredAt: new Date().toISOString(),
      });
      return Response.json({ code: "updated" }, { headers: privateHeaders });
    }
    return Response.json({ code: "invalid_request" }, { status: 400, headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}
