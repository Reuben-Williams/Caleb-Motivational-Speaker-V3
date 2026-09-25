import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";

import { AboutPageView } from "./about-page-view";
import { AudiencePageView, type CalebAudiencePath } from "./audience-page-view";
import { BookCalebPageView } from "./book-caleb-page-view";
import { BookMediaPageView } from "./book-media-page-view";
import { FaqPageView } from "./faq-page-view";
import { HomePageView } from "./home-page-view";
import { PrivacyPageView } from "./privacy-page-view";
import { SpeakingPageView } from "./speaking-page-view";
import { ThankYouPageView } from "./thank-you-page-view";

export const CALEB_PAGE_VIEW_PATHS = [
  "/", "/about", "/speaking", "/schools-colleges", "/faith-events",
  "/conferences-workshops", "/book-media", "/faq", "/book-caleb",
  "/privacy", "/thank-you",
] as const;

export type CalebPageViewPath = (typeof CALEB_PAGE_VIEW_PATHS)[number];

export function CalebPageView({
  content,
  pagePath,
}: Readonly<{ content: CalebResolvedPageContent; pagePath: CalebPageViewPath }>) {
  switch (pagePath) {
    case "/": return <HomePageView content={content} />;
    case "/about": return <AboutPageView content={content} />;
    case "/speaking": return <SpeakingPageView content={content} />;
    case "/schools-colleges":
    case "/faith-events":
    case "/conferences-workshops":
      return <AudiencePageView content={content} pagePath={pagePath as CalebAudiencePath} />;
    case "/book-media": return <BookMediaPageView content={content} />;
    case "/faq": return <FaqPageView content={content} />;
    case "/book-caleb": return <BookCalebPageView content={content} />;
    case "/privacy": return <PrivacyPageView />;
    case "/thank-you": return <ThankYouPageView content={content} />;
  }
}
