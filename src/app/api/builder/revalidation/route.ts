import { cookies } from "next/headers";

import { createCalebRevalidationRouteHandler } from "@/lib/site-editor/revalidation-route-handler";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { createCalebWebsiteRuntime } from "@/lib/staff/website-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createCalebRevalidationRouteHandler({
  resolveRuntime: async () => createCalebWebsiteRuntime(
    process.env,
    nextCookieAdapter(await cookies()),
  ),
});

export const GET = handler;
export const POST = handler;

