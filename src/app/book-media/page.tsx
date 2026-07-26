import type { Metadata } from "next";
import Image from "next/image";

import { AccessibleVideo } from "@/components/accessible-video";
import { FinalCta } from "@/components/final-cta";
import { LinkButton } from "@/components/link-button";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { book, routeCopy } from "@/content/site";
import { withBasePath } from "@/lib/base-path";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/book-media");

export default function BookMediaPage() {
  return (
    <>
      <PageHero
        current="Book & Media"
        eyebrow="AUTHOR · SPEAKER · CONVERSATION PARTNER"
        image="/media/book/caleb-book-amazon.webp"
        imageAlt={`Caleb Jakes with ${book.title}`}
        intro={routeCopy.bookMedia.intro}
        title={routeCopy.bookMedia.title}
      />

      <section className="book-feature-route">
        <div className="container book-feature-route__grid">
          <Reveal className="book-feature-route__cover">
            <Image
              alt={`Cover of ${book.title}`}
              height={900}
              sizes="(max-width: 767px) 70vw, 34vw"
              src={withBasePath(book.cover)}
              width={600}
            />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="eyebrow">THE BOOK</p>
            <h2>{book.title}</h2>
            <p className="serif-lead">
              A story of transformation, faith, surrender, identity, and the
              discovery of purpose.
            </p>
            <p>{book.body}</p>
            <div className="button-row">
              <LinkButton href={book.purchaseUrl}>Buy the Book</LinkButton>
              <LinkButton href="/book-caleb" variant="outline">
                Plan a Book-Based Event
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="media-reel-route">
        <div className="container">
          <SectionHeading
            body="Approved footage offers a direct look at Caleb’s delivery and message. Captions and a text transcript are available."
            eyebrow="THE SPEAKER REEL"
            title="SEE THE MESSAGE IN MOTION."
          />
          <Reveal>
            <AccessibleVideo compact />
          </Reveal>
        </div>
      </section>

      <section className="media-inquiry">
        <div className="container media-inquiry__grid">
          <Reveal>
            <p className="eyebrow">PODCASTS · PANELS · INTERVIEWS</p>
            <h2>BRING CALEB INTO THE CONVERSATION.</h2>
          </Reveal>
          <Reveal className="media-inquiry__copy" delay={0.08}>
            <p>
              Caleb is available for conversations about faith, identity,
              resilience, transformation, purpose, and the story behind the
              book. Share the program, format, audience, and desired topics in
              the inquiry.
            </p>
            <LinkButton href="/book-caleb">Request Speaker Information</LinkButton>
          </Reveal>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
