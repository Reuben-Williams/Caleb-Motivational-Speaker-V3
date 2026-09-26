import { cookies } from "next/headers";

import { createCalebContentRouteHandler } from "@/lib/site-editor/content-route-handler";
import { scheduleCalebContentRevalidation } from "@/lib/site-editor/revalidation-kickoff";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { createCalebWebsiteRuntime } from "@/lib/staff/website-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = createCalebContentRouteHandler({
  resolveRuntime: async () => createCalebWebsiteRuntime(
    process.env,
    nextCookieAdapter(await cookies()),
  ),
  onCommitted: scheduleCalebContentRevalidation,
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
