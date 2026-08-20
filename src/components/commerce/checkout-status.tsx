"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { parseCheckoutStatus, type CheckoutStatus } from "@/lib/platform/status";

const PENDING: CheckoutStatus = {
  state: "pending",
  orderId: null,
  grantsAccess: false,
};

export function CheckoutStatusPanel({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState<CheckoutStatus>(PENDING);
  const [unavailable, setUnavailable] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    const supplied = new URLSearchParams(window.location.search).get("session_id") ?? "";
    const checkoutSessionId = /^cs_test_[A-Za-z0-9_]{1,200}$/.test(supplied)
      ? supplied
      : null;
    if (!checkoutSessionId) {
      const unavailableTimer = setTimeout(() => setUnavailable(true), 0);
      return () => clearTimeout(unavailableTimer);
    }
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/commerce/orders/status?checkout_session_id=${encodeURIComponent(checkoutSessionId!)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new TypeError("Status unavailable.");
        const next = parseCheckoutStatus(await response.json());
        if (!active) return;
        setStatus(next);
        setUnavailable(false);
        if (next.state === "pending" && attempts < 8) {
          timer = setTimeout(() => void poll(), 2_000);
        }
      } catch {
        if (!active) return;
        setUnavailable(true);
        if (attempts < 3) timer = setTimeout(() => void poll(), 2_000);
      }
    }

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  const copy = outcomeCopy(status, unavailable);
  return (
    <section className="checkout-outcome" data-state={unavailable ? "unavailable" : status.state}>
      <p className="eyebrow">SECURE ORDER STATUS</p>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      {status.orderId ? (
        <p className="order-reference">
          Order reference <strong>{status.orderId}</strong>
        </p>
      ) : null}
      <div className="button-row">
        {status.grantsAccess ? (
          <Link className="button button--gold" href="/library">
            <span>Open customer library</span><span aria-hidden="true">↗</span>
          </Link>
        ) : null}
        <Link className="button button--outline" href="/store">
          <span>Return to store</span><span aria-hidden="true">↗</span>
        </Link>
      </div>
      <p className="commerce-note">
        This page never grants access by itself. Access appears only after the
        server verifies payment and completes fulfillment.
      </p>
    </section>
  );
}

function outcomeCopy(status: CheckoutStatus, unavailable: boolean) {
  if (unavailable) return {
    title: "WE’RE STILL CHECKING.",
    body: "The order system cannot confirm a result yet. Do not submit another payment. Please return shortly or contact info@calebjakes.com.",
  };
  if (status.state === "fulfilled") return {
    title: "YOUR ORDER IS READY.",
    body: "Payment and fulfillment have been verified. Your active digital access is available in the customer library.",
  };
  if (status.state === "paid") return {
    title: "PAYMENT RECEIVED.",
    body: "Payment is verified and fulfillment is being prepared. Digital access will appear after that process finishes.",
  };
  if (status.state === "attention") return {
    title: "YOUR ORDER NEEDS REVIEW.",
    body: "No second payment is needed. The team has an order record and will review the issue safely.",
  };
  if (status.state === "canceled") return {
    title: "CHECKOUT WAS CANCELED.",
    body: "The server recorded no completed order for this checkout.",
  };
  return {
    title: "CONFIRMING YOUR ORDER.",
    body: "The secure payment result is being reconciled. Keep this page open; there is no need to pay again.",
  };
}
