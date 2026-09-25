import { ThankYouState } from "@/components/thank-you-state";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";

export function ThankYouPageView({ content }: Readonly<{ content: CalebResolvedPageContent }>) {
  return <ThankYouState content={content} />;
}
