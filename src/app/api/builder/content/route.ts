import { cookies } from "next/headers";

import { createCalebContentRouteHandler } from "@/lib/site-editor/content-route-handler";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { createCalebWebsiteRuntime } from "@/lib/staff/website-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createCalebContentRouteHandler({
  resolveRuntime: async () => createCalebWebsiteRuntime(
    process.env,
    nextCookieAdapter(await cookies()),
  ),
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;

