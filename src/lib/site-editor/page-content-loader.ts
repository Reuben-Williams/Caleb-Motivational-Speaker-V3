import "server-only";

import type { PageContent } from "@reuben-williams/core";

import { createCalebPublicContentAdapter } from "@/lib/staff/website-runtime";

import { resolveCalebPublishedContent } from "./content-resolution";
import { CALEB_EDITOR_SITE_CONFIG } from "./site-config";

type DeclaredPagePath = (typeof CALEB_EDITOR_SITE_CONFIG.pages)[number]["path"];

type LoadPublished = (pagePath: DeclaredPagePath) => Promise<PageContent>;

type LoaderDiagnostic = Readonly<{
  code: "published_content_unavailable";
  pagePath: DeclaredPagePath;
}>;

export async function loadCalebPublishedPageContent(
  pagePath: DeclaredPagePath,
  options: Readonly<{
    loadPublished?: LoadPublished;
    reportDiagnostic?: (diagnostic: LoaderDiagnostic) => void;
  }> = {},
): Promise<PageContent> {
  const fallback = () => resolveCalebPublishedContent(pagePath, null);
  try {
    const loadPublished = options.loadPublished ?? (async (path) => {
      const adapter = createCalebPublicContentAdapter(process.env);
      if (!adapter) throw new Error("published_content_store_unavailable");
      return adapter.getPublishedContent(CALEB_EDITOR_SITE_CONFIG.siteId, path);
    });
    return await loadPublished(pagePath);
  } catch {
    options.reportDiagnostic?.({
      code: "published_content_unavailable",
      pagePath,
    });
    return fallback();
  }
}
