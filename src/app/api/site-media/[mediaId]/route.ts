import { readFile } from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";

import { getCalebSeedMedia } from "@/lib/site-editor/media-seed-catalog";
import { createCalebSiteMediaRouteHandler } from "@/lib/site-editor/site-media-route-handler";
import { nextCookieAdapter } from "@/lib/staff/next-cookies";
import { createCalebPublicMediaStore, createCalebWebsiteRuntime } from "@/lib/staff/website-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createCalebSiteMediaRouteHandler({
  async resolveSeed(mediaId) {
    const seed = getCalebSeedMedia(mediaId);
    if (!seed) return null;
    const bytes = await readFile(path.join(process.cwd(), "public", seed.path.slice(1)));
    return { bytes: new Uint8Array(bytes), mimeType: seed.mimeType };
  },
  resolvePublicStore: () => createCalebPublicMediaStore(process.env),
  async authorizeDraftStore(request) {
    const runtime = createCalebWebsiteRuntime(process.env, nextCookieAdapter(await cookies()));
    if (!runtime) return null;
    const authorized = await runtime.authorizeRead(request, "website.preview.read");
    return authorized.media;
  },
});

type Context = { params: Promise<{ mediaId: string }> };

export async function GET(request: Request, context: Context) {
  return handler(request, (await context.params).mediaId);
}

export async function HEAD(request: Request, context: Context) {
  return handler(request, (await context.params).mediaId);
}
