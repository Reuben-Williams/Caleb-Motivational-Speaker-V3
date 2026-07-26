import type { Metadata } from "next";

import { ThankYouState } from "@/components/thank-you-state";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/thank-you", {
  noindex: true,
});

export default function ThankYouPage() {
  return <ThankYouState />;
}
