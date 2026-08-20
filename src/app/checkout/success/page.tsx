import type { Metadata } from "next";

import { CheckoutStatusPanel } from "@/components/commerce/checkout-status";

export const metadata: Metadata = {
  title: "Order Status | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CheckoutSuccessPage() {
  return (
    <div className="commerce-page commerce-page--outcome">
      <div className="container">
        <CheckoutStatusPanel />
      </div>
    </div>
  );
}
