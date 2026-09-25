import type { Metadata } from "next";
import { CalebPageView } from "@/components/site-pages/page-view-registry";
import { createPageMetadata } from "@/lib/metadata";
import { loadCalebPublishedPageContent } from "@/lib/site-editor/page-content-loader";
export const metadata: Metadata = createPageMetadata("/book-media");
export default async function BookMediaPage() { return <CalebPageView content={await loadCalebPublishedPageContent("/book-media")} pagePath="/book-media" />; }
