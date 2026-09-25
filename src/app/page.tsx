import type { Metadata } from "next";

import { HomePageView } from "@/components/site-pages/home-page-view";
import { createPageMetadata } from "@/lib/metadata";
import { loadCalebPublishedPageContent } from "@/lib/site-editor/page-content-loader";

export const metadata: Metadata = createPageMetadata("/");

export default async function HomePage() {
  return <HomePageView content={await loadCalebPublishedPageContent("/")} />;
}
