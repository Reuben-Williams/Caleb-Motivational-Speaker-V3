import Link from "next/link";

import { AccessibleVideo } from "@/components/accessible-video";
import { BookingForm } from "@/components/booking-form";
import { CableLine } from "@/components/cable-line";
import { FaqList } from "@/components/faq-list";
import { FinalCta } from "@/components/final-cta";
import { HeroAtmosphere } from "@/components/hero-atmosphere";
import { LinkButton } from "@/components/link-button";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { EditableImage } from "@/components/site-content/editable-image";
import { EditableText } from "@/components/site-content/editable-text";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import {
  audiencePaths, book, bookingProcess, engagementFormats, faqs,
  organizerOutcomes, siteFacts, speakingTopics, topicPromise,
} from "@/content/site";

export function HomePageView({ content }: Readonly<{ content: CalebResolvedPageContent }>) {
  return <>
    <section className="home-hero" id="hero">
      <div className="home-hero__backdrop" /><div className="home-hero__light" /><div className="home-hero__noise" /><HeroAtmosphere />
      <div className="container home-hero__inner">
        <div className="home-hero__copy">
          <EditableText as="p" className="eyebrow hero-kicker" content={content} regionId="home.hero.eyebrow" />
          <h1><EditableText as="span" content={content} regionId="home.hero.title.line1" /><EditableText as="span" className="gold-word" content={content} regionId="home.hero.title.emphasis" /></h1>
          <EditableText as="p" className="home-hero__body" content={content} regionId="home.hero.body" />
          <div className="button-row"><LinkButton href="/book-caleb">Book Caleb</LinkButton><LinkButton href="#speaker-reel" variant="outline">Watch the Speaker Reel</LinkButton></div>
          <div className="home-hero__credentials"><EditableText as="p" content={content} regionId="home.hero.credential" /><EditableText as="p" content={content} regionId="home.hero.location" /></div>
        </div>
        <div className="home-hero__portrait"><EditableImage content={content} fill priority regionId="home.hero.image" sizes="(max-width: 767px) 100vw, 58vw" /><div className="home-hero__portrait-glow" /></div>
        <p className="home-hero__edition" aria-hidden="true">JOYIONAIRE™ / 2026</p>
      </div>
      <CableLine className="home-hero__cable" /><a className="scroll-cue" href="#authority"><span>Scroll to enter</span><span aria-hidden="true">↓</span></a>
    </section>
    <section className="authority-strip" id="authority"><div className="container authority-strip__inner">{siteFacts.map((item, index) => <div className="authority-item" key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><p>{item.value}</p></div>)}</div></section>
    <section className="story-section" id="story"><div className="container story-section__grid">
      <Reveal className="story-section__media"><div className="story-image story-image--primary"><EditableImage content={content} fill regionId="home.story.image.primary" sizes="(max-width: 767px) 92vw, 42vw" /></div><div className="story-image story-image--secondary"><EditableImage content={content} fill regionId="home.story.image.secondary" sizes="(max-width: 767px) 42vw, 20vw" /></div><span className="story-section__index">01 / THE STORY</span></Reveal>
      <Reveal className="story-section__copy" delay={0.08}><EditableText as="p" className="eyebrow" content={content} regionId="home.story.eyebrow" /><h2><EditableText as="span" content={content} regionId="home.story.title.line1" /><EditableText as="span" content={content} regionId="home.story.title.emphasis" /></h2><EditableText as="p" className="story-section__lead" content={content} regionId="home.story.lead" /><EditableText as="p" content={content} regionId="home.story.body" /><EditableText as="blockquote" content={content} regionId="home.story.quote" /><LinkButton href="/about" variant="text">Read Caleb’s Story</LinkButton></Reveal>
    </div></section>
    <section className="audience-section" id="audiences"><div className="container"><SectionHeading body="One message. Four rooms. Each experience begins with the people in front of Caleb and the purpose that brought them together." eyebrow="WHO CALEB SERVES" title="THE STAGE CHANGES. THE PURPOSE DOESN’T." /><div className="audience-grid">{audiencePaths.map((item, index) => <Reveal className={`audience-card audience-card--${index + 1}`} delay={index * 0.06} key={item.id}><span className="audience-card__number">0{index + 1}</span><h3>{item.title}</h3><p>{item.description}</p><Link href={item.href}>Explore this audience <span aria-hidden="true">↗</span></Link></Reveal>)}</div></div></section>
    <section className="reel-section" id="speaker-reel"><div className="container reel-section__heading"><EditableText as="p" className="eyebrow" content={content} regionId="home.reel.eyebrow" /><EditableText as="h2" content={content} regionId="home.reel.title" /><EditableText as="p" content={content} regionId="home.reel.body" /></div><Reveal className="reel-section__frame"><AccessibleVideo responsiveHomepage /></Reveal></section>
    <section className="topics-section" id="topics"><div className="container"><SectionHeading body={topicPromise} eyebrow="SIGNATURE MESSAGES" title="WORDS THAT MOVE WITH YOU." /><div className="topic-grid">{speakingTopics.map((topic, index) => <Reveal className="topic-card" delay={(index % 4) * 0.04} key={topic}><span>{String(index + 1).padStart(2, "0")}</span><h3>{topic}</h3><p>A purpose-centered message shaped around the audience, event setting, and desired emphasis.</p><Link href="/speaking" aria-label={`Explore ${topic}`}><span aria-hidden="true">↗</span></Link></Reveal>)}</div><div className="section-action"><LinkButton href="/speaking">Explore Speaking Topics</LinkButton></div></div></section>
    <section className="outcomes-section"><div className="container outcomes-section__grid"><Reveal><p className="eyebrow">WHAT ORGANIZERS CAN EXPECT</p><h2>A MESSAGE BUILT FOR THE ROOM — NOT PULLED FROM A SHELF.</h2></Reveal><div className="outcomes-list">{organizerOutcomes.map((outcome, index) => <Reveal className="outcome-row" delay={index * 0.05} key={outcome}><span>0{index + 1}</span><p>{outcome}</p></Reveal>)}</div></div></section>
    <section className="book-section"><div className="container book-section__grid"><Reveal className="book-section__visual"><div className="book-glow" /><EditableImage content={content} height={750} regionId="home.book.cover" sizes="(max-width: 767px) 62vw, 30vw" width={500} /><span className="book-section__caption">THE WEIGHTY JOY OF SURRENDER</span></Reveal><Reveal className="book-section__copy" delay={0.08}><EditableText as="p" className="eyebrow" content={content} regionId="home.book.eyebrow" /><EditableText as="h2" content={content} regionId="home.book.heading" /><EditableText as="p" className="serif-lead" content={content} regionId="home.book.title" /><EditableText as="p" content={content} regionId="home.book.body" /><div className="button-row"><LinkButton href={book.purchaseUrl}>Buy the Book</LinkButton><LinkButton href="/book-media" variant="outline">Book & Media</LinkButton></div></Reveal></div></section>
    <section className="formats-section"><div className="container"><SectionHeading body="From a focused keynote to an extended workshop, the format is discussed around the audience and the organizer’s goals." eyebrow="ENGAGEMENT FORMATS" title="CHOOSE THE SHAPE. BUILD THE EXPERIENCE." /><div className="format-list">{engagementFormats.map((format, index) => <Reveal className="format-row" key={format.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{format.title}</h3><p>{format.description}</p><Link href="/book-caleb" aria-label={`Inquire about ${format.title}`}>↗</Link></Reveal>)}</div></div></section>
    <section className="process-section"><div className="container"><SectionHeading eyebrow="THE BOOKING PROCESS" title="FROM INQUIRY TO IMPACT." align="center" /><div className="process-grid">{bookingProcess.map((step, index) => <Reveal className="process-card" delay={index * 0.08} key={step.title}><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></Reveal>)}</div><CableLine /></div></section>
    <section className="faq-preview"><div className="container faq-preview__grid"><SectionHeading eyebrow="BEFORE YOU INQUIRE" title="CLEAR ANSWERS FOR EVENT PLANNERS." /><div><FaqList items={faqs.slice(0, 5)} /><LinkButton href="/faq" variant="text">View All Questions</LinkButton></div></div></section>
    <section className="booking-bridge"><div className="container booking-bridge__grid"><Reveal><p className="eyebrow">START THE CONVERSATION</p><h2>TELL US ABOUT THE ROOM YOU’RE BUILDING.</h2></Reveal><Reveal className="booking-bridge__form" delay={0.08}><BookingForm variant="compact" /></Reveal></div></section>
    <FinalCta />
  </>;
}
