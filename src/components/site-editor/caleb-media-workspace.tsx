"use client";

import type { MediaAsset } from "@reuben-williams/core";
import { useState } from "react";
import styles from "./caleb-attached-website-editor.module.css";

export function CalebMediaWorkspace({ assets, busy, onUpload }: Readonly<{
  assets: readonly MediaAsset[];
  busy: boolean;
  onUpload(input: { file: File; label: string; alt: string }): Promise<void>;
}>) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [alt, setAlt] = useState("");
  return <section className={styles.library} aria-label="Media library">
    <header><span className={styles.eyebrow}>Media</span><h2>Approved site images</h2><p>Upload a JPG, PNG, or WebP with a clear internal label and useful alternative text.</p></header>
    <form onSubmit={(event) => { event.preventDefault(); if (file) void onUpload({ file, label, alt }).then(() => { setFile(null); setLabel(""); setAlt(""); }); }}>
      <label>Image<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <label>Internal label<input value={label} maxLength={240} required onChange={(event) => setLabel(event.target.value)} /></label>
      <label>Alternative text<textarea value={alt} maxLength={240} required onChange={(event) => setAlt(event.target.value)} /></label>
      <button className={styles.primary} disabled={busy || !file || !label.trim() || !alt.trim()}>Upload image</button>
    </form>
    <div className={styles.libraryGrid}>{assets.map((asset) => <article key={asset.id}><img src={asset.url} alt={asset.alt} /><strong>{asset.label}</strong><span>{asset.alt}</span></article>)}</div>
  </section>;
}
