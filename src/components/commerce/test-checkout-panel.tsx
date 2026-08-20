"use client";

import { useState } from "react";

type TestOffer = Readonly<{
  stableKey: string;
  title: string;
  currency: "USD";
  unitAmountMinor: number;
}>;

export function TestCheckoutPanel({ offers }: { offers: readonly TestOffer[] }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function startCheckout(offerStableKey: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-platform-test-token": token,
        },
        body: JSON.stringify({ offerStableKey }),
      });
      const result = await response.json() as {
        url?: string;
        error?: { code?: string };
      };
      if (!response.ok || !result.url) {
        setNotice(
          result.error?.code === "TEST_ACCESS_DENIED"
            ? "That test-access code was not accepted."
            : "Test checkout is not available yet. No charge was created.",
        );
        return;
      }
      window.location.assign(result.url);
    } catch {
      setNotice("Test checkout is temporarily unavailable. No charge was created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="test-checkout-panel" aria-labelledby="test-checkout-title">
      <p className="test-badge">STRIPE TEST MODE · NO LIVE PURCHASES</p>
      <h1 id="test-checkout-title">Private checkout verification</h1>
      <p>
        This area is for approved launch testing only. Public customers continue
        to Caleb&apos;s existing store.
      </p>
      {offers.length === 0 ? (
        <aside className="commerce-status" role="status">
          No offers are testable yet. Caleb must approve the catalog, prices,
          policies, shipping details, and digital files first.
        </aside>
      ) : (
        <>
          <label className="test-token-field">
            Private test-access code
            <input
              autoComplete="off"
              onChange={(event) => setToken(event.target.value)}
              type="password"
              value={token}
            />
          </label>
          <div className="test-offer-list">
            {offers.map((offer) => (
              <article key={offer.stableKey}>
                <div>
                  <h2>{offer.title}</h2>
                  <p>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: offer.currency,
                    }).format(offer.unitAmountMinor / 100)}
                  </p>
                </div>
                <button
                  className="button button--gold"
                  disabled={busy || token.length < 32}
                  onClick={() => void startCheckout(offer.stableKey)}
                  type="button"
                >
                  Start test checkout
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {notice ? <p className="commerce-notice" role="status">{notice}</p> : null}
    </section>
  );
}
