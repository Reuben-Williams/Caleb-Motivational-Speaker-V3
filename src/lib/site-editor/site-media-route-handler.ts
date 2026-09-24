import "server-only";

import type { CalebMediaDelivery } from "./media-store";

interface DeliveryStore {
  delivery(mediaId: string): Promise<CalebMediaDelivery | null>;
  bytes(objectKey: string): Promise<Uint8Array>;
}

const PRIVATE = "private, no-store";
const PUBLIC = "public, max-age=31536000, immutable";

function notFound() {
  return Response.json({ code: "not_found" }, { status: 404, headers: { "Cache-Control": PRIVATE } });
}

function bytesResponse(bytes: Uint8Array, mimeType: string, cacheControl: string) {
  return new Response(bytes as BodyInit, {
    status: 200,
    headers: { "Content-Type": mimeType, "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" },
  });
}

export function createCalebSiteMediaRouteHandler(input: {
  resolveSeed(mediaId: string): Promise<{ bytes: Uint8Array; mimeType: string } | null>;
  resolvePublicStore(): DeliveryStore | null;
  authorizeDraftStore(request: Request): Promise<DeliveryStore | null>;
}) {
  return async function siteMedia(request: Request, mediaId: string): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") return notFound();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(mediaId)) return notFound();
    try {
      const seed = await input.resolveSeed(mediaId);
      if (seed) return bytesResponse(seed.bytes, seed.mimeType, PUBLIC);
      const publicStore = input.resolvePublicStore();
      if (!publicStore) return notFound();
      const delivery = await publicStore.delivery(mediaId);
      if (!delivery) return notFound();
      if (delivery.published) {
        return bytesResponse(await publicStore.bytes(delivery.objectKey), delivery.asset.mimeType, PUBLIC);
      }
      const draftStore = await input.authorizeDraftStore(request).catch(() => null);
      if (!draftStore) return notFound();
      const authorized = await draftStore.delivery(mediaId);
      if (!authorized) return notFound();
      return bytesResponse(await draftStore.bytes(authorized.objectKey), authorized.asset.mimeType, PRIVATE);
    } catch {
      return notFound();
    }
  };
}
