import type { Metadata } from "next";

import { CustomerLibraryShell } from "@/components/commerce/customer-library-shell";
import { getCommerceEnvironment } from "@/lib/platform/environment";

export const metadata: Metadata = {
  title: "Customer Library | Caleb Jakes",
  description: "Secure access to eligible Caleb Jakes digital purchases.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function LibraryPage() {
  const environment = getCommerceEnvironment();
  return <div className="commerce-page commerce-page--library"><div className="container">
    <CustomerLibraryShell enabled={environment.providersReady && environment.runtimeEnabled} />
  </div></div>;
}
