import type { Metadata } from "next";

import { FaqList } from "@/components/faq-list";
import { FinalCta } from "@/components/final-cta";
import { PageHero } from "@/components/page-hero";
import { StructuredData } from "@/components/structured-data";
import { contact, faqs, routeCopy } from "@/content/site";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/faq");

export default function FaqPage() {
  return (
    <>
      <StructuredData faq />
      <PageHero
        current="FAQ"
        eyebrow="FOR EVENT PLANNERS"
        image="/media/photos/caleb-book-wide-02.webp"
        imageAlt="Caleb Jakes in a portrait"
        intro={routeCopy.faq.intro}
        title={routeCopy.faq.title}
      />
      <section className="faq-route">
        <div className="container faq-route__grid">
          <div className="faq-route__aside">
            <p className="eyebrow">STILL HAVE A QUESTION?</p>
            <h2>LET’S TALK THROUGH THE DETAILS.</h2>
            <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
            <a href={contact.emailHref}>{contact.email}</a>
          </div>
          <FaqList items={faqs} />
        </div>
      </section>
      <FinalCta />
    </>
  );
}

