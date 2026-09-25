import type { Metadata } from "next";
import { CalebPageView } from "@/components/site-pages/page-view-registry";
import { createPageMetadata } from "@/lib/metadata";
import { loadCalebPublishedPageContent } from "@/lib/site-editor/page-content-loader";
export const metadata: Metadata = createPageMetadata("/conferences-workshops");
export default async function ConferencesPage() { return <CalebPageView content={await loadCalebPublishedPageContent("/conferences-workshops")} pagePath="/conferences-workshops" />; }
