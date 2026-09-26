import "server-only";

import { revalidatePath } from "next/cache";

import { createCalebPublicContentAdapter } from "@/lib/staff/website-runtime";
import type { ClaimedCalebRevalidationJob } from "./revalidation-store";
import { CALEB_EDITOR_SITE_CONFIG } from "./site-config";

export async function refreshCalebPublishedPage(path: string, job: ClaimedCalebRevalidationJob): Promise<void> {
  if (path !== job.pagePath) throw new Error("revalidation_path_mismatch");
  const adapter = createCalebPublicContentAdapter(process.env);
  if (!adapter) throw new Error("published_content_store_unavailable");
  revalidatePath(path);
  // Public pages are request-rendered by connection(). The readback proves the
  // same public adapter can load this committed publication (or a later one),
  // without the visitor-facing outage fallback masking a database failure.
  await adapter.verifyPublishedContent(CALEB_EDITOR_SITE_CONFIG.siteId, path, job.publishedVersionId);
}
