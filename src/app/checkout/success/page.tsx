import type { Metadata } from "next";

import { CheckoutStatusPanel } from "@/components/commerce/checkout-status";

export const metadata: Metadata = {
  title: "Order Status | Caleb Jakes",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supplied = (await searchParams).session_id;
  const checkoutSessionId = typeof supplied === "string" && /^cs_test_[A-Za-z0-9_]{1,200}$/.test(supplied)
    ? supplied
    : null;
  return (
    <div className="commerce-page commerce-page--outcome">
      <div className="container">
        <CheckoutStatusPanel checkoutSessionId={checkoutSessionId} />
      </div>
    </div>
  );
}
