import type { Metadata } from "next";
import { CalebPageView } from "@/components/site-pages/page-view-registry";
import { createPageMetadata } from "@/lib/metadata";
import { loadCalebPublishedPageContent } from "@/lib/site-editor/page-content-loader";
export const metadata: Metadata = createPageMetadata("/book-caleb");
export default async function BookCalebPage() { return <CalebPageView content={await loadCalebPublishedPageContent("/book-caleb")} pagePath="/book-caleb" />; }
