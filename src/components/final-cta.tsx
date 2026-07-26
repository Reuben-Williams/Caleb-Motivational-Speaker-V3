import Image from "next/image";

import { LinkButton } from "@/components/link-button";
import { Reveal } from "@/components/reveal";
import { contact } from "@/content/site";
import { withBasePath } from "@/lib/base-path";

export function FinalCta() {
  return (
    <section className="final-cta">
      <Image
        alt=""
        fill
        sizes="100vw"
        src={withBasePath("/media/photos/caleb-speaking-mobile.webp")}
      />
      <div className="final-cta__veil" />
      <div className="container final-cta__content">
        <Reveal>
          <p className="eyebrow">BRING THE MESSAGE HOME</p>
          <h2>
            YOUR AUDIENCE DOESN’T NEED ANOTHER SPEECH.
            <span> THEY NEED A MESSAGE THEY CAN CARRY HOME.</span>
          </h2>
          <p>
            Bring Caleb Jakes to your school, church, conference, campus, or
            organization for an experience built around resilience, purpose,
            faith, and practical transformation.
          </p>
          <div className="button-row">
            <LinkButton href="/book-caleb">Book Caleb</LinkButton>
            <LinkButton href={contact.phoneHref} variant="outline">
              Call {contact.phoneDisplay}
            </LinkButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
