import Image from "next/image";

import { Breadcrumbs } from "@/components/breadcrumbs";
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
}: {
  current: string;
  eyebrow: string;
  title: string;
  intro: string;
  image?: string;
  imageAlt?: string;
  cta?: boolean;
}) {
  return (
    <section className="page-hero">
      <div className="container page-hero__grid">
        <Reveal className="page-hero__copy">
          <Breadcrumbs current={current} />
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-hero__intro">{intro}</p>
          {cta ? <LinkButton href="/book-caleb">Book Caleb</LinkButton> : null}
        </Reveal>
        <Reveal className="page-hero__media" delay={0.08}>
          <Image
            alt={imageAlt}
            fill
            loading="eager"
            sizes="(max-width: 767px) 100vw, 52vw"
            src={withBasePath(image)}
          />
          <div className="image-label">
            <span>01</span>
            <span>PAIN → PURPOSE</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
