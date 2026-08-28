import "server-only";

import { getCommerceEnvironment } from "./environment";

type EnvironmentInput = Readonly<Record<string, string | undefined>>;

const JSON_HEADERS = Object.freeze({
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
});

export function createPreviewReadinessRoute(source: EnvironmentInput) {
  return async function previewReadinessRoute(): Promise<Response> {
    if (source.VERCEL_ENV !== "preview" || source.VERCEL_TARGET_ENV !== "preview") {
      return new Response(null, {
        status: 404,
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    const environment = getCommerceEnvironment(source);
    return Response.json(
      {
        ready: environment.previewGuard.ready,
        reasons: environment.previewGuard.reasons,
        mode: environment.mode,
        runtimeEnabled: environment.runtimeEnabled,
        capabilities: environment.capabilities,
      },
      { headers: JSON_HEADERS },
    );
  };
}
