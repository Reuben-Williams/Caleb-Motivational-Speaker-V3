"use client";

import { useState, type FormEvent } from "react";
import { createBuilderBrowserClient } from "@reuben-williams/next/auth";

export function StaffSecurityVerification() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const submittedCode = code;
    setCode("");
    try {
      const url = process.env.NEXT_PUBLIC_STAFF_AUTH_URL;
      const publishableKey = process.env.NEXT_PUBLIC_STAFF_AUTH_PUBLISHABLE_KEY;
      if (!url || !publishableKey) throw new Error("unavailable");
      const client = createBuilderBrowserClient({ url, publishableKey });
      const factors = await client.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const factor = factors.data.totp.find((item) => item.status === "verified");
      if (!factor) {
        setMessage("This staff account needs an authenticator set up before publishing or uploading images. Contact your site administrator.");
        return;
      }
      const result = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: submittedCode });
      if (result.error) throw result.error;
      setMessage("Security verified. You can now publish, restore versions, or upload images. Verification lasts 15 minutes.");
      setOpen(false);
    } catch {
      setMessage("Security could not be verified. Enter a fresh authenticator code and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="Staff security verification">
    <button type="button" onClick={() => setOpen((current) => !current)} disabled={busy}>Verify publishing access</button>
    {open ? <form onSubmit={verify} style={{ display: "grid", gap: ".6rem", maxWidth: 360, marginTop: ".75rem" }}>
      <label>Authenticator code<input aria-label="Authenticator code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label>
      <p>Enter the six-digit code from your authenticator app.</p>
      <button type="submit" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify security"}</button>
    </form> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
