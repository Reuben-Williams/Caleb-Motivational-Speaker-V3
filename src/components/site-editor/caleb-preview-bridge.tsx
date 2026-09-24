"use client";

import {
  createBuilderPreviewMessage,
  isBuilderPreviewMessage,
  type BuilderPreviewMessage,
} from "@reuben-williams/core";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect } from "react";

import { CALEB_EDITOR_SITE_CONFIG, findCalebEditorRegion } from "@/lib/site-editor/site-config";

interface MessageBoundary {
  origin: string;
  expectedOrigin: string;
  pagePath: string;
}

function declaredPage(path: string) {
  return CALEB_EDITOR_SITE_CONFIG.pages.some((page) => page.path === path);
}

export function isAllowedCalebPreviewMessage(value: unknown, boundary: MessageBoundary): value is BuilderPreviewMessage {
  if (boundary.origin !== boundary.expectedOrigin || !isBuilderPreviewMessage(value, CALEB_EDITOR_SITE_CONFIG.siteId)) {
    return false;
  }
  if (value.pagePath !== boundary.pagePath || !declaredPage(value.pagePath)) return false;
  if (value.type === "builder:select-region") {
    const region = findCalebEditorRegion(value.pagePath, value.regionId);
    return Boolean(region && region.kind === value.kind);
  }
  return value.type === "builder:clear-selection" || value.type === "builder:ready" || value.type === "builder:navigate";
}

export function CalebPreviewBridge({
  pagePath,
  children,
  onMessage,
}: Readonly<{
  pagePath: string;
  children: ReactNode;
  onMessage?: (message: BuilderPreviewMessage) => void;
}>) {
  useEffect(() => {
    if (!declaredPage(pagePath)) return;
    const origin = window.location.origin;
    window.parent.postMessage(createBuilderPreviewMessage(CALEB_EDITOR_SITE_CONFIG.siteId, {
      type: "builder:ready",
      pagePath,
    }), origin);
    const receive = (event: MessageEvent) => {
      if (!isAllowedCalebPreviewMessage(event.data, { origin: event.origin, expectedOrigin: origin, pagePath }) ||
        event.source !== window.parent) return;
      onMessage?.(event.data);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onMessage, pagePath]);

  const select = (event: ReactMouseEvent<HTMLElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-builder-region-id]");
    if (!target) return;
    const regionId = target.dataset.builderRegionId;
    const kind = target.dataset.builderRegionKind;
    if (!regionId || (kind !== "text" && kind !== "image")) return;
    const region = findCalebEditorRegion(pagePath, regionId);
    if (!region || region.kind !== kind) return;
    window.parent.postMessage(createBuilderPreviewMessage(CALEB_EDITOR_SITE_CONFIG.siteId, {
      type: "builder:select-region",
      pagePath,
      regionId,
      kind,
    }), window.location.origin);
  };

  return <div
    onClickCapture={(event) => {
      const target = event.target as HTMLElement;
      if (target.closest("a,button,input,select,textarea")) event.preventDefault();
    }}
    onClick={select}
    onSubmit={(event) => event.preventDefault()}
    data-caleb-preview-page={pagePath}
  >{children}</div>;
}
