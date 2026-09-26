"use client";

import {
  createBuilderPreviewMessage,
  isBuilderPreviewMessage,
  type BuilderPreviewMessage,
} from "@reuben-williams/core";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { CALEB_EDITOR_SITE_CONFIG, findCalebEditorRegion } from "@/lib/site-editor/site-config";
import styles from "./caleb-preview-bridge.module.css";

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
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!declaredPage(pagePath)) return;
    const origin = window.location.origin;
    const ready = () => window.parent.postMessage(createBuilderPreviewMessage(CALEB_EDITOR_SITE_CONFIG.siteId, {
      type: "builder:ready",
      pagePath,
    }), origin);
    const decorated = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-builder-region-id]") ?? [])
      .filter((element) => {
        const region = findCalebEditorRegion(pagePath, element.dataset.builderRegionId ?? "");
        return region && region.kind === element.dataset.builderRegionKind;
      });
    const originals = decorated.map((element) => ({ element, tab: element.getAttribute("tabindex"), title: element.getAttribute("title") }));
    decorated.forEach((element) => {
      element.dataset.calebEditable = "true";
      if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
      element.title = `Edit ${element.dataset.builderRegionKind === "image" ? "image" : "text"}`;
    });
    ready();
    // Hydration ordering can put the first message before the parent's listener.
    let attempts = 0;
    const retry = window.setInterval(() => {
      ready();
      if (++attempts >= 30) window.clearInterval(retry);
    }, 500);
    const receive = (event: MessageEvent) => {
      if (!isAllowedCalebPreviewMessage(event.data, { origin: event.origin, expectedOrigin: origin, pagePath }) ||
        event.source !== window.parent) return;
      onMessage?.(event.data);
    };
    window.addEventListener("message", receive);
    // Header/footer are outside this wrapper, but the entire private iframe
    // must stay a non-submitting preview rather than navigate to public pages.
    const preventNavigation = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
    };
    const preventSubmission = (event: Event) => event.preventDefault();
    document.addEventListener("click", preventNavigation, true);
    document.addEventListener("submit", preventSubmission, true);
    return () => {
      window.removeEventListener("message", receive);
      document.removeEventListener("click", preventNavigation, true);
      document.removeEventListener("submit", preventSubmission, true);
      window.clearInterval(retry);
      originals.forEach(({ element, tab, title }) => {
        delete element.dataset.calebEditable;
        delete element.dataset.calebSelected;
        if (tab === null) element.removeAttribute("tabindex"); else element.setAttribute("tabindex", tab);
        if (title === null) element.removeAttribute("title"); else element.title = title;
      });
    };
  }, [onMessage, pagePath]);

  const select = (element: HTMLElement) => {
    const target = element.closest<HTMLElement>("[data-builder-region-id]");
    if (!target) return;
    const regionId = target.dataset.builderRegionId;
    const kind = target.dataset.builderRegionKind;
    if (!regionId || (kind !== "text" && kind !== "image")) return;
    const region = findCalebEditorRegion(pagePath, regionId);
    if (!region || region.kind !== kind) return;
    root.current?.querySelectorAll<HTMLElement>("[data-caleb-selected]").forEach((current) => delete current.dataset.calebSelected);
    target.dataset.calebSelected = "true";
    window.parent.postMessage(createBuilderPreviewMessage(CALEB_EDITOR_SITE_CONFIG.siteId, {
      type: "builder:select-region",
      pagePath,
      regionId,
      kind,
      ...(target.dataset.builderRegionValue !== undefined
        ? { value: target.dataset.builderRegionValue }
        : {}),
      ...(kind === "image" && target.dataset.builderRegionAlt !== undefined
        ? { alt: target.dataset.builderRegionAlt }
        : {}),
    }), window.location.origin);
  };

  return <div
    ref={root}
    className={styles.preview}
    onClickCapture={(event) => {
      const target = event.target as HTMLElement;
      if (target.closest("a,button,input,select,textarea")) event.preventDefault();
    }}
    onClick={(event) => select(event.target as HTMLElement)}
    onKeyDown={(event) => {
      if ((event.key === "Enter" || event.key === " ") && (event.target as HTMLElement).closest('[data-caleb-editable="true"]')) {
        event.preventDefault();
        select(event.target as HTMLElement);
      }
    }}
    onSubmit={(event) => event.preventDefault()}
    data-caleb-preview-page={pagePath}
  >{children}</div>;
}
