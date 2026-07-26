import type { Metadata } from "next";
import Image from "next/image";

import { FinalCta } from "@/components/final-cta";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { routeCopy, siteFacts } from "@/content/site";
import { withBasePath } from "@/lib/base-path";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/about");

export default function AboutPage() {
  const copy = routeCopy.about;
  return (
    <>
      <PageHero
        current="About Caleb"
        eyebrow="MEET CALEB JAKES"
        image="/media/photos/caleb-book-portrait.webp"
        imageAlt="Caleb Jakes holding his book"
        intro={copy.intro}
        title={copy.title}
      />

      <section className="story-chapters">
        <div className="container">
          <SectionHeading
            eyebrow="A LIFE REFRAMED"
            title="PAIN DIDN’T DISAPPEAR. ITS PURPOSE CAME INTO VIEW."
          />
          <div className="story-chapters__list">
            {copy.chapters.map((chapter, index) => (
              <Reveal className="story-chapter" key={chapter.title}>
                <span>0{index + 1}</span>
                <h3>{chapter.title}</h3>
                <p>{chapter.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="about-collage">
        <div className="container about-collage__grid">
          <Reveal className="about-collage__large">
            <Image
              alt="Caleb Jakes presenting his book"
              fill
              sizes="(max-width: 767px) 100vw, 55vw"
              src={withBasePath("/media/photos/caleb-book-wide-01.webp")}
            />
          </Reveal>
          <Reveal className="about-collage__copy" delay={0.08}>
            <p className="eyebrow">JOYIONAIRE™</p>
            <h2>A DIFFERENT PICTURE OF WEALTH.</h2>
            <p>
              Joyionaire™ Enterprises is built around being rich in joy, faith,
              character, purpose, and the strength to keep standing when life
              becomes heavy.
            </p>
            <blockquote>
              “The goal is not to deny the weight. It is to discover what can
              be built through surrender, resilience, and purpose.”
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="about-authority">
        <div className="container">
          {siteFacts.map((fact, index) => (
            <Reveal className="about-authority__item" key={fact.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{fact.value}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <FinalCta />
    </>
  );
}
