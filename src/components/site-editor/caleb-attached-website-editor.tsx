"use client";

import type { BuilderPreviewMessage, MediaAsset } from "@reuben-williams/core";
import { useEffect, useReducer, useState } from "react";

import { StaffWorkspaceShell } from "@/components/admin/staff-workspace-shell";
import { calebEditorReducer, initialCalebEditorState } from "./caleb-editor-controller";
import { type CalebSelectedRegion, CalebRegionInspector } from "./caleb-region-inspector";
import { CalebMediaWorkspace } from "./caleb-media-workspace";
import { calebPreviewPath } from "@/lib/site-editor/preview-paths";
import { CALEB_EDITOR_SITE_CONFIG } from "@/lib/site-editor/site-config";
import styles from "./caleb-attached-website-editor.module.css";

function csrf() {
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("builder_csrf="))?.slice(13) ?? "";
}

async function command(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(String(body.code ?? "request_failed")), { status: response.status });
  return body;
}

export function CalebAttachedWebsiteEditor() {
  const [pagePath, setPagePath] = useState("/");
  const [workspace, setWorkspace] = useState<"website.pages" | "website.media" | "website.history">("website.pages");
  const [content, setContent] = useState<{ draftVersionId: string | null; publishedVersionId: string | null }>({ draftVersionId: null, publishedVersionId: null });
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<CalebSelectedRegion | null>(null);
  const [chosen, setChosen] = useState<MediaAsset | null>(null);
  const [alt, setAlt] = useState("");
  const [state, dispatch] = useReducer(calebEditorReducer, initialCalebEditorState);
  const busy = ["loading", "saving", "publishing", "restoring", "uploading"].includes(state.status);

  async function load(pathname = pagePath) {
    dispatch({ type: "loading" });
    try {
      const [draft, assets] = await Promise.all([
        command(`/api/builder/content?path=${encodeURIComponent(pathname)}&mode=draft`),
        command("/api/builder/media"),
      ]);
      setContent({ draftVersionId: draft.draftVersionId, publishedVersionId: draft.publishedVersionId });
      setMedia(assets.assets);
      dispatch({ type: "success", message: "Draft loaded." });
    } catch { dispatch({ type: "error", message: "The website draft could not be loaded." }); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load("/"); }, 0);
    return () => window.clearTimeout(timer);
    // The first load is intentionally tied to mount; page changes call load directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent<BuilderPreviewMessage>) => {
      if (event.origin !== window.location.origin || event.data?.type !== "builder:select-region" || event.data.pagePath !== pagePath) return;
      const message = event.data;
      const region = CALEB_EDITOR_SITE_CONFIG.pages.find((page) => page.path === pagePath)?.regions.find((item) => item.id === message.regionId);
      if (!region || (message.kind !== "text" && message.kind !== "image")) return;
      const next = { id: region.id, kind: message.kind, value: message.value ?? "", alt: message.alt ?? "" };
      setSelected(next); setAlt(next.alt); setChosen(null); dispatch({ type: "local", value: next.value });
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [pagePath]);

  async function save() {
    if (!selected) return;
    dispatch({ type: "saving" });
    const value = selected.kind === "text"
      ? { type: "text", value: state.localValue }
      : chosen ? { type: "image", mediaId: chosen.id, src: chosen.path, alt } : null;
    if (!value) return dispatch({ type: "error", message: "Choose an image first." });
    try {
      const result = await command("/api/builder/content", {
        method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf(), "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ action: "saveDraft", pagePath, regionId: selected.id, value, expectedDraftVersionId: content.draftVersionId }),
      });
      setContent((current) => ({ ...current, draftVersionId: result.draftVersionId }));
      dispatch({ type: "success", message: "Draft saved. The public site has not changed." });
    } catch (error) {
      dispatch(error && typeof error === "object" && "status" in error && error.status === 409 ? { type: "conflict" } : { type: "error", message: "The draft was not saved." });
    }
  }

  async function publish() {
    if (!window.confirm(`Publish the current draft for ${pagePath === "/" ? "Home" : pagePath}?`)) return;
    dispatch({ type: "publishing" });
    try {
      const result = await command("/api/builder/content", {
        method: "PUT", headers: { "content-type": "application/json", "x-csrf-token": csrf(), "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ pagePath, expectedDraftVersionId: content.draftVersionId, expectedPublishedVersionId: content.publishedVersionId }),
      });
      setContent((current) => ({ ...current, publishedVersionId: result.publishedVersionId }));
      dispatch({ type: "revalidation_pending", correlationId: result.correlationId });
    } catch { dispatch({ type: "error", message: "Nothing was published." }); }
  }

  async function upload(input: { file: File; label: string; alt: string }) {
    dispatch({ type: "uploading" });
    const form = new FormData();
    form.set("file", input.file);
    form.set("label", input.label);
    form.set("alt", input.alt);
    try {
      const result = await command("/api/builder/media", {
        method: "POST",
        headers: { "x-csrf-token": csrf(), "idempotency-key": crypto.randomUUID() },
        body: form,
      });
      setMedia((current) => [result.asset, ...current]);
      dispatch({ type: "success", message: "Image uploaded privately. It will not appear publicly until used in a published page." });
    } catch {
      dispatch({ type: "error", message: "The image was not uploaded." });
    }
  }

  return (
    <StaffWorkspaceShell activeWorkspace={workspace} currentPath={pagePath} onWorkspaceChange={(next) => {
      if (next === "website.pages" || next === "website.media" || next === "website.history") setWorkspace(next);
    }} onPageChange={(path) => { setPagePath(path); setSelected(null); void load(path); }}>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>Website editor</span><h1>Edit the live Caleb Jakes website</h1><p>Save private drafts, review them at three sizes, then publish one page at a time.</p></div>
          <div className={styles.actions}><a href={pagePath} target="_blank">View public page</a><button type="button" className={styles.publish} onClick={publish} disabled={busy}>Publish page</button></div>
        </header>
        <nav className={styles.pages} aria-label="Website pages">{CALEB_EDITOR_SITE_CONFIG.pages.map((page) => <button key={page.path} aria-current={page.path === pagePath ? "page" : undefined} onClick={() => { setPagePath(page.path); setSelected(null); void load(page.path); }}>{page.label}</button>)}</nav>
        {state.message ? <p className={styles.status} data-state={state.status} role="status">{state.message}</p> : null}
        {workspace === "website.media" ? <CalebMediaWorkspace assets={media} busy={busy} onUpload={upload} /> : null}
        {workspace === "website.history" ? <section className={styles.library}><h2>Version history</h2><p>Choose a page to review its saved versions and restore points.</p></section> : null}
        {workspace === "website.pages" ? <div className={styles.editorGrid}>
          <section className={styles.preview}><iframe title={`${pagePath} draft preview`} src={calebPreviewPath(pagePath)} /></section>
          <CalebRegionInspector region={selected} value={state.localValue} alt={alt} media={media} busy={busy} onValue={(value) => dispatch({ type: "local", value })} onAlt={setAlt} onChoose={(asset) => { setChosen(asset); setAlt(asset.alt); }} onSave={save} />
        </div> : null}
      </div>
    </StaffWorkspaceShell>
  );
}
