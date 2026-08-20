"use client";

import { useState, type FormEvent } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";

export function PasswordlessSignInForm({ enabled, siteKey }: { enabled: boolean; siteKey: string }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const turnstileToken = String(data.get("turnstileToken") ?? "");
    if (!email || !turnstileToken) {
      setNotice("Enter your email and complete the security check.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/customer-auth/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, returnTo: "/library", turnstileToken }),
      });
      if (!response.ok) {
        setNotice("Secure library sign-in is not available yet. No email was sent.");
        return;
      }
      setNotice("If that email has eligible purchases, a secure sign-in link is on the way.");
      form.reset();
    } catch {
      setNotice("Secure library sign-in is temporarily unavailable. No email was sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="passwordless-form" onSubmit={submit}>
      <label>
        Purchase email
        <input autoComplete="email" name="email" required type="email" />
      </label>
      {enabled && siteKey ? (
        <TurnstileWidget siteKey={siteKey} />
      ) : (
        <p className="commerce-status" role="status">
          Secure customer-library sign-in is not active yet, so no email request can be sent.
        </p>
      )}
      <button className="button button--gold" disabled={busy || !siteKey || !enabled} type="submit">
        {busy ? "Requesting…" : "Email me a secure link"}
      </button>
      {notice ? <p className="commerce-notice" role="status">{notice}</p> : null}
    </form>
  );
}
