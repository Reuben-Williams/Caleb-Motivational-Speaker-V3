"use client";

import { useState } from "react";

import type {
  SpeakingLeadDetail,
  SpeakingLeadListItem,
  SpeakingLeadStatus,
} from "@/lib/staff/lead-repository";
import styles from "./speaking-engagements-workspace.module.css";

const statusLabels: Record<SpeakingLeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
  spam: "Spam review",
};

function label(value: string): string {
  return value.replaceAll(/([A-Z])/g, " $1").replaceAll("-", " ").trim();
}

function csrfFromCookie(): string {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("builder_csrf="))
    ?.slice("builder_csrf=".length) ?? "";
}

export function SpeakingEngagementsWorkspace({
  initialLeads,
}: Readonly<{ initialLeads: readonly SpeakingLeadListItem[] }>) {
  const [leads, setLeads] = useState([...initialLeads]);
  const [detail, setDetail] = useState<SpeakingLeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activity, setActivity] = useState("");

  async function open(lead: SpeakingLeadListItem) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/speaking-engagements/${lead.id}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("detail_unavailable");
      const result = (await response.json()) as { lead: SpeakingLeadDetail };
      setDetail(result.lead);
    } catch {
      setError("This inquiry could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function mutate(body: Record<string, unknown>) {
    if (!detail) return;
    let csrf = csrfFromCookie();
    if (!csrf) {
      const csrfResponse = await fetch("/api/admin/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("csrf_unavailable");
      csrf = ((await csrfResponse.json()) as { token: string }).token;
    }
    const response = await fetch(`/api/admin/speaking-engagements/${detail.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
        "x-csrf-token": csrf,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("mutation_failed");
    const result = (await response.json()) as {
      lead?: SpeakingLeadDetail;
      version?: number;
    };
    if (result.lead) setDetail(result.lead);
    if (result.version && body.action === "change_status") {
      setLeads((current) =>
        current.map((lead) =>
          lead.id === detail.id
            ? {
                ...lead,
                status: body.status as SpeakingLeadStatus,
                version: result.version!,
                updatedAt: new Date().toISOString(),
              }
            : lead,
        ),
      );
      setDetail((current) =>
        current
          ? {
              ...current,
              status: body.status as SpeakingLeadStatus,
              version: result.version!,
            }
          : current,
      );
    }
  }

  async function changeStatus(status: SpeakingLeadStatus) {
    if (!detail) return;
    setError("");
    try {
      await mutate({
        action: "change_status",
        status,
        expectedVersion: detail.version,
      });
    } catch {
      setError("The status was not changed. Reload the inquiry and try again.");
    }
  }

  async function addActivity(kind: "note" | "task") {
    const body = activity.trim();
    if (!body) return;
    setError("");
    try {
      await mutate({ action: "add_activity", kind, body });
      setActivity("");
      if (detail) await open(detail);
    } catch {
      setError("The update was not saved. Please try again.");
    }
  }

  return (
    <main className={styles.workspace}>
      <header className={styles.header}>
        <p>Caleb Jakes · Native booking workspace</p>
        <h1>Speaking Engagements</h1>
        <span>{leads.length} distinct event {leads.length === 1 ? "inquiry" : "inquiries"}</span>
      </header>

      <div className={styles.grid}>
        <section className={styles.list} aria-label="Speaking inquiry list">
          {leads.length === 0 ? (
            <div className={styles.empty}>
              <h2>No speaking inquiries yet</h2>
              <p>New website inquiries will appear here after they pass the security check.</p>
            </div>
          ) : (
            leads.map((lead) => (
              <button
                type="button"
                key={lead.id}
                className={styles.card}
                data-active={detail?.id === lead.id}
                onClick={() => open(lead)}
                aria-label={`Open ${lead.displayName}`}
              >
                <span className={styles.cardTop}>
                  <strong>{lead.displayName}</strong>
                  <em data-status={lead.status}>{statusLabels[lead.status]}</em>
                </span>
                <span>{lead.organization ?? "Independent organizer"}</span>
                <small>{lead.title}</small>
              </button>
            ))
          )}
        </section>

        <section className={styles.detail} aria-live="polite">
          {loading ? <p className={styles.state}>Loading inquiry…</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {!loading && !detail ? (
            <div className={styles.empty}>
              <h2>Select an inquiry</h2>
              <p>Review the event, organizer, delivery state, notes, and next step.</p>
            </div>
          ) : null}
          {!loading && detail ? (
            <div className={styles.detailBody}>
              <div className={styles.detailHeading}>
                <div><p>{detail.organization}</p><h2>{detail.displayName}</h2></div>
                <label>
                  <span>Status</span>
                  <select value={detail.status} onChange={(event) => changeStatus(event.target.value as SpeakingLeadStatus)}>
                    {Object.entries(statusLabels).map(([status, text]) => <option key={status} value={status}>{text}</option>)}
                  </select>
                </label>
              </div>

              <section className={styles.panel}>
                <h3>Event inquiry</h3>
                <dl className={styles.facts}>
                  {Object.entries(detail.submission?.payload ?? {}).map(([key, value]) => (
                    <div key={key}><dt>{label(key)}</dt><dd>{Array.isArray(value) ? value.join(", ") : String(value || "—")}</dd></div>
                  ))}
                </dl>
              </section>

              <section className={styles.panel}>
                <h3>Contact</h3>
                <ul className={styles.cleanList}>
                  {detail.identities.map((identity) => <li key={`${identity.kind}:${identity.value}`}><span>{label(identity.kind)}</span><strong>{identity.value}</strong></li>)}
                </ul>
              </section>

              <section className={styles.panel}>
                <h3>Notifications</h3>
                <ul className={styles.cleanList}>
                  {detail.notifications.map((notification) => <li key={notification.kind}><span>{label(notification.kind)}</span><strong>{label(notification.state)}</strong></li>)}
                </ul>
              </section>

              <section className={styles.panel}>
                <h3>Add a note or task</h3>
                <textarea value={activity} maxLength={4000} onChange={(event) => setActivity(event.target.value)} placeholder="Record the next step…" />
                <div className={styles.actions}>
                  <button type="button" onClick={() => addActivity("note")}>Add note</button>
                  <button type="button" onClick={() => addActivity("task")}>Add task</button>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
