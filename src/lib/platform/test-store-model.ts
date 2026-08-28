import "server-only";

import type { CommerceEnvironment } from "./environment";
import { listCalebPreviewOffers } from "./caleb-preview-catalog";

export function getTestStoreModel(environment: CommerceEnvironment) {
  const enabled = environment.mode === "platform_test"
    && environment.runtimeEnabled
    && environment.previewGuard.ready;
  return Object.freeze({
    enabled,
    label: "TEST / PREVIEW" as const,
    offers: enabled ? listCalebPreviewOffers(environment.previewGuard) : Object.freeze([]),
  });
}
