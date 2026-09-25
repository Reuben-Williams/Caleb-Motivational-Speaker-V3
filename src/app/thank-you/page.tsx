import type { Metadata } from "next";
import { CalebPageView } from "@/components/site-pages/page-view-registry";
import { createPageMetadata } from "@/lib/metadata";
import { loadCalebPublishedPageContent } from "@/lib/site-editor/page-content-loader";
export const metadata: Metadata = createPageMetadata("/thank-you", { noindex: true });
export default async function ThankYouPage() { return <CalebPageView content={await loadCalebPublishedPageContent("/thank-you")} pagePath="/thank-you" />; }
