import type { Metadata } from "next";

import { CheckoutMessage } from "@/components/commerce/checkout-message";

export const metadata: Metadata = {
  title: "Order Needs Attention | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CheckoutAttentionPage() {
  return <div className="commerce-page commerce-page--outcome"><div className="container">
    <CheckoutMessage
      body="Your order could not be confirmed automatically. No second payment is needed while the team reviews the server record."
      eyebrow="ORDER REVIEW"
      title="WE’LL CHECK THIS SAFELY."
    />
  </div></div>;
}
