import { FaqList } from "@/components/faq-list";
import { FinalCta } from "@/components/final-cta";
import { PageHero } from "@/components/page-hero";
import { StructuredData } from "@/components/structured-data";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { resolvedText } from "@/components/site-content/site-page-content";
import { contact, faqs, routeCopy } from "@/content/site";

const faqKeys = ["audiences", "secular", "faith-adjustment", "international", "formats", "keynote-workshop", "timing", "quote-information", "panels-podcasts", "travel", "media-kit"] as const;

export function FaqPageView({ content }: Readonly<{ content: CalebResolvedPageContent }>) {
  const items = faqKeys.map((key, index) => ({
    question: resolvedText(content, `faq.item.${key}.question`) || faqs[index].question,
    answer: resolvedText(content, `faq.item.${key}.answer`) || faqs[index].answer,
  }));
  return <>
    <StructuredData faq faqItems={items} />
    <PageHero current="FAQ" eyebrow={routeCopy.faq.title} intro={routeCopy.faq.intro} title={routeCopy.faq.title} content={content} regions={{ eyebrow: "faq.hero.eyebrow", title: "faq.hero.title", intro: "faq.hero.intro", image: "faq.hero.image" }} />
    <section className="faq-route"><div className="container faq-route__grid"><div className="faq-route__aside"><p className="eyebrow">STILL HAVE A QUESTION?</p><h2>LET’S TALK THROUGH THE DETAILS.</h2><a href={contact.phoneHref}>{contact.phoneDisplay}</a><a href={contact.emailHref}>{contact.email}</a></div><FaqList items={items} regionIds={faqKeys.map((key) => ({ question: `faq.item.${key}.question`, answer: `faq.item.${key}.answer` }))} /></div></section><FinalCta />
  </>;
}
