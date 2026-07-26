import type { Metadata } from "next";
import Link from "next/link";

import { FinalCta } from "@/components/final-cta";
import { LinkButton } from "@/components/link-button";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import {
  audiencePaths,
  engagementFormats,
  routeCopy,
  speakingTopics,
  topicPromise,
} from "@/content/site";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/speaking");

export default function SpeakingPage() {
  const copy = routeCopy.speaking;
  return (
    <>
      <PageHero
        current="Speaking"
        eyebrow="KEYNOTES · WORKSHOPS · CONVERSATIONS"
        intro={copy.intro}
        title={copy.title}
      />

      <section className="route-audiences">
        <div className="container">
          <SectionHeading
            eyebrow="AUDIENCE PATHWAYS"
            title="ONE MESSAGE. SHAPED FOR THE PEOPLE IN THE ROOM."
          />
          <div className="route-audiences__grid">
            {audiencePaths.map((item, index) => (
              <Reveal className="route-audience-card" key={item.id}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link href={item.href}>Explore pathway ↗</Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="speaking-topics-route">
        <div className="container speaking-topics-route__grid">
          <Reveal>
            <p className="eyebrow">SIGNATURE MESSAGES</p>
            <h2>SUBJECTS THAT OPEN A DOOR TO PURPOSE.</h2>
            <p>{topicPromise}</p>
            <p className="route-note">{copy.note}</p>
          </Reveal>
          <div className="speaking-topic-list">
            {speakingTopics.map((item, index) => (
              <Reveal className="speaking-topic-row" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item}</h3>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="route-formats">
        <div className="container">
          <SectionHeading
            eyebrow="WAYS TO WORK TOGETHER"
            title="FORMAT FOLLOWS PURPOSE."
          />
          <div className="compact-card-grid compact-card-grid--three">
            {engagementFormats.map((item) => (
              <Reveal className="compact-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </Reveal>
            ))}
          </div>
          <div className="section-action">
            <LinkButton href="/book-caleb">Request Availability</LinkButton>
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

