import type { Metadata } from "next";

import { CheckoutMessage } from "@/components/commerce/checkout-message";

export const metadata: Metadata = {
  title: "Checkout Canceled | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CheckoutCancelPage() {
  return <div className="commerce-page commerce-page--outcome"><div className="container">
    <CheckoutMessage
      body="You left the secure checkout before this site verified an order. If you saw a charge or are unsure, contact the team before trying again."
      eyebrow="CHECKOUT CANCELED"
      title="NO NEW ORDER WAS CONFIRMED."
    />
  </div></div>;
}
