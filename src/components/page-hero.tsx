import Image from "next/image";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { EditableImage } from "@/components/site-content/editable-image";
import { EditableText } from "@/components/site-content/editable-text";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { LinkButton } from "@/components/link-button";
import { Reveal } from "@/components/reveal";
import { withBasePath } from "@/lib/base-path";

export function PageHero({
  current,
  eyebrow,
  title,
  intro,
  image = "/media/photos/caleb-speaking-wide.webp",
  imageAlt = "Caleb Jakes speaking with a microphone",
  cta = true,
  ctaLabel = "Book Caleb",
  imageLabel = "PAIN → PURPOSE",
  content,
  regions,
}: {
  current: string;
  eyebrow: string;
  title: string;
  intro: string;
  image?: string;
  imageAlt?: string;
  cta?: boolean;
  ctaLabel?: ReactNode;
  imageLabel?: ReactNode;
  content?: CalebResolvedPageContent;
  regions?: Readonly<{
    eyebrow: string;
    title: string;
    intro: string;
    image?: string;
  }>;
}) {
  return (
    <section className="page-hero">
      <div className="container page-hero__grid">
        <Reveal className="page-hero__copy">
          <Breadcrumbs current={current} />
          {content && regions
            ? <EditableText as="p" className="eyebrow" content={content} regionId={regions.eyebrow} />
            : <p className="eyebrow">{eyebrow}</p>}
          {content && regions
            ? <EditableText as="h1" content={content} regionId={regions.title} />
            : <h1>{title}</h1>}
          {content && regions
            ? <EditableText as="p" className="page-hero__intro" content={content} regionId={regions.intro} />
            : <p className="page-hero__intro">{intro}</p>}
          {cta ? <LinkButton href="/book-caleb">{ctaLabel}</LinkButton> : null}
        </Reveal>
        <Reveal className="page-hero__media" delay={0.08}>
          {content && regions?.image
            ? <EditableImage
                content={content}
                fill
                loading="eager"
                regionId={regions.image}
                sizes="(max-width: 767px) 100vw, 52vw"
              />
            : <Image
                alt={imageAlt}
                fill
                loading="eager"
                sizes="(max-width: 767px) 100vw, 52vw"
                src={withBasePath(image)}
              />}
          <div className="image-label">
            <span>01</span>
            <span>{imageLabel}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
