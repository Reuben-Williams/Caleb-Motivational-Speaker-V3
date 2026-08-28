import type { Metadata } from "next";

import { TestCheckoutPanel } from "@/components/commerce/test-checkout-panel";
import { getCommerceEnvironment } from "@/lib/platform/environment";
import { getTestStoreModel } from "@/lib/platform/test-store-model";

export const metadata: Metadata = {
  title: "Private Checkout Verification | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default function TestStorePage() {
  const model = getTestStoreModel(getCommerceEnvironment());
  return (
    <div className="commerce-page commerce-page--test">
      <div className="container">
        <p className="eyebrow">{model.label}</p>
        <TestCheckoutPanel offers={model.offers} />
      </div>
    </div>
  );
}
