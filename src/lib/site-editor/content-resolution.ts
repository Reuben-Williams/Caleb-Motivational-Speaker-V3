import type { EditableValue, PageContent } from "@reuben-williams/core";

import { validateCalebEditableValue } from "./content-validation";
import {
  CALEB_EDITOR_SITE_CONFIG,
  type CalebEditorPage,
} from "./site-config";

export type CalebContentDiagnosticCode =
  | "invalid_published_override"
  | "undeclared_published_override"
  | "invalid_draft_override"
  | "undeclared_draft_override";

export interface CalebStoredPageContent {
  path: string;
  regions: Readonly<Record<string, unknown>>;
  versionId?: string;
  updatedAt?: string;
}

interface ContentResolutionOptions {
  resolveMedia?: (mediaId: string) => { path: string } | undefined;
  reportDiagnostic?: (diagnostic: Readonly<{
    code: CalebContentDiagnosticCode;
    pagePath: string;
    regionId: string;
  }>) => void;
}

function declaredPage(path: string): CalebEditorPage {
  const page = CALEB_EDITOR_SITE_CONFIG.pages.find((candidate) => candidate.path === path);
  if (!page) throw new Error("undeclared_page_path");
  return page;
}

function fallbacks(page: CalebEditorPage): Record<string, EditableValue> {
  return Object.fromEntries(
    page.regions.map((region) => [region.id, structuredClone(region.fallback)]),
  );
}

function validatedLayer(
  page: CalebEditorPage,
  stored: CalebStoredPageContent | null,
  phase: "draft" | "publish",
  options: ContentResolutionOptions,
): Record<string, EditableValue> {
  if (!stored) return {};
  if (stored.path !== page.path) throw new Error("stored_page_path_mismatch");
  const definitions = new Map(page.regions.map((region) => [region.id, region]));
  const output: Record<string, EditableValue> = {};
  for (const [regionId, value] of Object.entries(stored.regions)) {
    const definition = definitions.get(regionId);
    if (!definition) {
      options.reportDiagnostic?.({
        code: phase === "publish"
          ? "undeclared_published_override"
          : "undeclared_draft_override",
        pagePath: page.path,
        regionId,
      });
      continue;
    }
    try {
      output[regionId] = validateCalebEditableValue(definition, value, {
        phase,
        resolveMedia: options.resolveMedia,
      });
    } catch {
      options.reportDiagnostic?.({
        code: phase === "publish"
          ? "invalid_published_override"
          : "invalid_draft_override",
        pagePath: page.path,
        regionId,
      });
    }
  }
  return output;
}

export function validateCalebPageOverrides(
  path: string,
  regions: Readonly<Record<string, unknown>>,
  options: Pick<ContentResolutionOptions, "resolveMedia"> & {
    phase?: "draft" | "publish";
  } = {},
): Record<string, EditableValue> {
  const page = declaredPage(path);
  const definitions = new Map(page.regions.map((region) => [region.id, region]));
  const output: Record<string, EditableValue> = {};
  for (const [regionId, value] of Object.entries(regions)) {
    const definition = definitions.get(regionId);
    if (!definition) throw new Error("undeclared_content_override");
    try {
      output[regionId] = validateCalebEditableValue(definition, value, {
        phase: options.phase ?? "publish",
        resolveMedia: options.resolveMedia,
      });
    } catch {
      throw new Error("invalid_content_override");
    }
  }
  return output;
}

export function resolveCalebPublishedContent(
  path: string,
  published: CalebStoredPageContent | null,
  options: ContentResolutionOptions = {},
): PageContent {
  const page = declaredPage(path);
  const regions = {
    ...fallbacks(page),
    ...validatedLayer(page, published, "publish", options),
  };
  return {
    path,
    regions,
    ...(published?.versionId ? { versionId: published.versionId } : {}),
    ...(published?.updatedAt ? { updatedAt: published.updatedAt } : {}),
  };
}

export function resolveCalebDraftContent(
  path: string,
  published: CalebStoredPageContent | null,
  draft: CalebStoredPageContent | null,
  options: ContentResolutionOptions = {},
): PageContent {
  const page = declaredPage(path);
  const currentPublished = resolveCalebPublishedContent(path, published, options);
  return {
    path,
    regions: {
      ...currentPublished.regions,
      ...validatedLayer(page, draft, "draft", options),
    },
    ...(draft?.versionId
      ? { versionId: draft.versionId }
      : currentPublished.versionId
        ? { versionId: currentPublished.versionId }
        : {}),
    ...(draft?.updatedAt
      ? { updatedAt: draft.updatedAt }
      : currentPublished.updatedAt
        ? { updatedAt: currentPublished.updatedAt }
        : {}),
  };
}
