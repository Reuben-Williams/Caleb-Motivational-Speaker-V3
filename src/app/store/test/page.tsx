import type { Metadata } from "next";

import { TestCheckoutPanel } from "@/components/commerce/test-checkout-panel";
import { listApprovedOffers } from "@/lib/platform/routing";

export const metadata: Metadata = {
  title: "Private Checkout Verification | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function TestStorePage() {
  return (
    <div className="commerce-page commerce-page--test">
      <div className="container">
        <TestCheckoutPanel offers={listApprovedOffers()} />
      </div>
    </div>
  );
}
