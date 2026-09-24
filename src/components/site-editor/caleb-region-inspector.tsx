import type { MediaAsset } from "@reuben-williams/core";

import styles from "./caleb-attached-website-editor.module.css";

export interface CalebSelectedRegion {
  id: string;
  kind: "text" | "image";
  value: string;
  alt: string;
}

export function CalebRegionInspector({ region, value, alt, media, busy, onValue, onAlt, onChoose, onSave }: Readonly<{
  region: CalebSelectedRegion | null;
  value: string;
  alt: string;
  media: readonly MediaAsset[];
  busy: boolean;
  onValue(value: string): void;
  onAlt(value: string): void;
  onChoose(asset: MediaAsset): void;
  onSave(): void;
}>) {
  if (!region) return <aside className={styles.inspector}><p>Select highlighted text or an image in the preview to edit it.</p></aside>;
  return (
    <aside className={styles.inspector} aria-label="Selected website area">
      <span className={styles.eyebrow}>Selected area</span>
      <h2>{region.id.split(".").slice(-2).join(" ")}</h2>
      {region.kind === "text" ? (
        <label>Text<textarea value={value} onChange={(event) => onValue(event.target.value)} /></label>
      ) : (
        <>
          <label>Alternative text<textarea value={alt} onChange={(event) => onAlt(event.target.value)} /></label>
          <div className={styles.mediaChoices}>
            {media.map((asset) => <button type="button" key={asset.id} onClick={() => onChoose(asset)}><img src={asset.url} alt="" /><span>{asset.label}</span></button>)}
          </div>
        </>
      )}
      <button type="button" className={styles.primary} onClick={onSave} disabled={busy || (region.kind === "text" ? !value.trim() : !alt.trim())}>Save draft</button>
    </aside>
  );
}
