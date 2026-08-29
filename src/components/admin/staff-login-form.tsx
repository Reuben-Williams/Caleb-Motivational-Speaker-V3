"use client";

import { FormEvent, useState } from "react";

import { createBuilderBrowserClient } from "@reuben-williams/next/auth";

export function StaffLoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const url = process.env.NEXT_PUBLIC_STAFF_AUTH_URL;
      const publishableKey = process.env.NEXT_PUBLIC_STAFF_AUTH_PUBLISHABLE_KEY;
      if (!url || !publishableKey) throw new Error("not_configured");
      const client = createBuilderBrowserClient({ url, publishableKey });
      const redirect = `${window.location.origin}/admin/auth/callback?next=/admin/editor/speaking-engagements`;
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect, shouldCreateUser: false },
      });
      if (error) throw error;
      setMessage("Check your approved staff email for a secure sign-in link.");
    } catch {
      setMessage("A sign-in link could not be sent. Confirm this is an approved staff email and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
      <label style={{ display: "grid", gap: ".45rem" }}>
        <span>Approved staff email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{ minHeight: 48, borderRadius: 8, border: "1px solid #383838", padding: ".75rem" }}
        />
      </label>
      <button type="submit" disabled={sending} style={{ minHeight: 48, border: 0, borderRadius: 999, background: "#d7a74d", fontWeight: 700 }}>
        {sending ? "Sending…" : "Email me a secure sign-in link"}
      </button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
