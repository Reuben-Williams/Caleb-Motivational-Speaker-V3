import { FinalCta } from "@/components/final-cta";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { EditableImage } from "@/components/site-content/editable-image";
import { EditableText } from "@/components/site-content/editable-text";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { routeCopy, siteFacts } from "@/content/site";

const chapterIds = ["struggle", "transformation", "calling", "mission"] as const;

export function AboutPageView({ content }: Readonly<{ content: CalebResolvedPageContent }>) {
  return <>
    <PageHero current="About Caleb" eyebrow={routeCopy.about.title} title={routeCopy.about.title} intro={routeCopy.about.intro} content={content} regions={{ eyebrow: "about.hero.eyebrow", title: "about.hero.title", intro: "about.hero.intro", image: "about.hero.image" }} />
    <section className="story-chapters"><div className="container"><SectionHeading eyebrow="A LIFE REFRAMED" title="PAIN DIDN’T DISAPPEAR. ITS PURPOSE CAME INTO VIEW." /><div className="story-chapters__list">{chapterIds.map((key, index) => <Reveal className="story-chapter" key={key}><span>0{index + 1}</span><EditableText as="h3" content={content} regionId={`about.chapter.${key}.title`} /><EditableText as="p" content={content} regionId={`about.chapter.${key}.body`} /></Reveal>)}</div></div></section>
    <section className="about-collage"><div className="container about-collage__grid"><Reveal className="about-collage__large"><EditableImage content={content} fill regionId="about.collage.image" sizes="(max-width: 767px) 100vw, 55vw" /></Reveal><Reveal className="about-collage__copy" delay={0.08}><EditableText as="p" className="eyebrow" content={content} regionId="about.collage.eyebrow" /><EditableText as="h2" content={content} regionId="about.collage.title" /><EditableText as="p" content={content} regionId="about.collage.body" /><EditableText as="blockquote" content={content} regionId="about.collage.quote" /></Reveal></div></section>
    <section className="about-authority"><div className="container">{siteFacts.map((fact, index) => <Reveal className="about-authority__item" key={fact.id}><span>{String(index + 1).padStart(2, "0")}</span><p>{fact.value}</p></Reveal>)}</div></section><FinalCta />
  </>;
}
