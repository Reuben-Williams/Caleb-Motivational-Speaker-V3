import type { VersionRecord } from "@reuben-williams/core";

import styles from "./caleb-attached-website-editor.module.css";

function statusLabel(status: VersionRecord["status"]): string {
  if (status === "undoRollback") return "Undo rollback version";
  return `${status.charAt(0).toUpperCase()}${status.slice(1)} version`;
}

export function CalebHistoryWorkspace({
  versions,
  busy,
  onRestore,
  onUndo,
}: Readonly<{
  versions: readonly VersionRecord[];
  busy: boolean;
  onRestore: (version: VersionRecord) => void;
  onUndo: (version: VersionRecord) => void;
}>) {
  return (
    <section className={styles.library}>
      <h2>Version history</h2>
      <p>Restore a previous page version or undo a rollback. Each action creates a new auditable version.</p>
      {versions.length === 0 ? <p>No saved versions exist for this page yet.</p> : (
        <div className={styles.historyList}>
          {versions.map((version) => (
            <article key={version.id}>
              <div>
                <strong>{statusLabel(version.status)}</strong>
                <span>{new Date(version.createdAt).toLocaleString()}</span>
              </div>
              {version.status === "rollback" ? (
                <button type="button" disabled={busy} onClick={() => onUndo(version)}>Undo this rollback</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => onRestore(version)}>Restore this version</button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
