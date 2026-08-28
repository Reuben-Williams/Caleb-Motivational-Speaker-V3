import type { Metadata } from "next";

import { CheckoutStatusPanel } from "@/components/commerce/checkout-status";
import { getCommerceEnvironment } from "@/lib/platform/environment";

export const metadata: Metadata = {
  title: "Order Status | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function CheckoutSuccessPage() {
  const environment = getCommerceEnvironment();
  return (
    <div className="commerce-page commerce-page--outcome">
      <div className="container">
        <CheckoutStatusPanel enabled={environment.capabilities.statusReady && environment.runtimeEnabled} />
      </div>
    </div>
  );
}
