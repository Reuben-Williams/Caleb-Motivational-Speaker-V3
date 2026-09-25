import { FinalCta } from "@/components/final-cta";
import { LinkButton } from "@/components/link-button";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { EditableText } from "@/components/site-content/editable-text";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { engagementFormats, organizerOutcomes } from "@/content/site";

export type AudiencePageProps = {
  current: string;
  eyebrow: string;
  title: string;
  intro: string;
  note: string;
  image: string;
  imageAlt: string;
  challenges: readonly string[];
  outcomes: readonly string[];
  formatIndexes: readonly number[];
  accent: "cobalt" | "gold" | "burgundy";
  content?: CalebResolvedPageContent;
  regionPrefix?: "schools" | "faith" | "conferences";
};

export function AudiencePage({
  current,
  eyebrow,
  title,
  intro,
  note,
  image,
  imageAlt,
  challenges,
  outcomes,
  formatIndexes,
  accent,
  content,
  regionPrefix,
}: AudiencePageProps) {
  return (
    <>
      <PageHero
        current={current}
        eyebrow={eyebrow}
        image={image}
        imageAlt={imageAlt}
        intro={intro}
        title={title}
        content={content}
        regions={content && regionPrefix ? {
          eyebrow: `${regionPrefix}.hero.eyebrow`,
          title: `${regionPrefix}.hero.title`,
          intro: `${regionPrefix}.hero.intro`,
          image: `${regionPrefix}.hero.image`,
        } : undefined}
      />
      <section className={`audience-detail audience-detail--${accent}`}>
        <div className="container audience-detail__intro">
          <Reveal>
            <p className="eyebrow">BUILT AROUND THE ROOM</p>
            <h2>THE CHALLENGE IS PERSONAL. THE PATH FORWARD CAN BE SHARED.</h2>
          </Reveal>
          <Reveal className="audience-detail__note" delay={0.08}>
            {content && regionPrefix
              ? <EditableText as="p" content={content} regionId={`${regionPrefix}.audience.note`} />
              : <p>{note}</p>}
          </Reveal>
        </div>
        <div className="container two-column-lists">
          <div>
            <h3>What the audience may be carrying</h3>
            <ul>
              {challenges.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>What the experience can invite</h3>
            <ul>
              {outcomes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="audience-formats">
        <div className="container">
          <SectionHeading
            body="Timing, emphasis, and interaction are discussed before an engagement is confirmed."
            eyebrow="POSSIBLE FORMATS"
            title="AN EXPERIENCE THAT FITS THE MOMENT."
          />
          <div className="compact-card-grid">
            {formatIndexes.map((index) => {
              const item = engagementFormats[index];
              return (
                <Reveal className="compact-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </Reveal>
              );
            })}
          </div>
          <div className="section-action section-action--left">
            <LinkButton href="/book-caleb">Discuss Your Event</LinkButton>
          </div>
        </div>
      </section>
      <section className="shared-outcomes">
        <div className="container">
          <SectionHeading
            eyebrow="A PURPOSE-CENTERED APPROACH"
            title="WHAT ORGANIZERS CAN EXPECT."
          />
          <div className="shared-outcomes__grid">
            {organizerOutcomes.slice(0, 4).map((item, index) => (
              <Reveal className="shared-outcomes__item" key={item}>
                <span>0{index + 1}</span>
                <p>{item}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
