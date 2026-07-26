import type { Metadata } from "next";
import Image from "next/image";
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
import {
  audiencePaths,
  book,
  bookingProcess,
  engagementFormats,
  faqs,
  hero,
  organizerOutcomes,
  siteFacts,
  speakingTopics,
  topicPromise,
} from "@/content/site";
import { withBasePath } from "@/lib/base-path";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/");

export default function HomePage() {
  return (
    <>
      <section className="home-hero" id="hero">
        <div className="home-hero__backdrop" />
        <div className="home-hero__light" />
        <div className="home-hero__noise" />
        <HeroAtmosphere />
        <div className="container home-hero__inner">
          <div className="home-hero__copy">
            <p className="eyebrow hero-kicker">{hero.eyebrow}</p>
            <h1>
              <span>PAIN HAS</span>
              <span className="gold-word">PURPOSE.</span>
            </h1>
            <p className="home-hero__body">{hero.body}</p>
            <div className="button-row">
              <LinkButton href="/book-caleb">Book Caleb</LinkButton>
              <LinkButton href="#speaker-reel" variant="outline">
                Watch the Speaker Reel
              </LinkButton>
            </div>
            <div className="home-hero__credentials">
              <p>{hero.credential}</p>
              <p>{hero.location}</p>
            </div>
          </div>

          <div className="home-hero__portrait">
            <Image
              alt="Caleb Jakes speaking into a handheld microphone"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 58vw"
              src={withBasePath("/media/people/caleb-speaking-cutout.webp")}
            />
            <div className="home-hero__portrait-glow" />
          </div>

          <p className="home-hero__edition" aria-hidden="true">
            JOYIONAIRE™ / 2026
          </p>
        </div>
        <CableLine className="home-hero__cable" />
        <a className="scroll-cue" href="#authority">
          <span>Scroll to enter</span>
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="authority-strip" id="authority">
        <div className="container authority-strip__inner">
          {siteFacts.map((item, index) => (
            <div className="authority-item" key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="story-section" id="story">
        <div className="container story-section__grid">
          <Reveal className="story-section__media">
            <div className="story-image story-image--primary">
              <Image
                alt="Caleb Jakes holding his book"
                fill
                sizes="(max-width: 767px) 92vw, 42vw"
                src={withBasePath("/media/photos/caleb-book-portrait.webp")}
              />
            </div>
            <div className="story-image story-image--secondary">
              <Image
                alt="Caleb Jakes in a portrait with his book"
                fill
                sizes="(max-width: 767px) 42vw, 20vw"
                src={withBasePath("/media/photos/caleb-book-wide-02.webp")}
              />
            </div>
            <span className="story-section__index">01 / THE STORY</span>
          </Reveal>

          <Reveal className="story-section__copy" delay={0.08}>
            <p className="eyebrow">THE STORY BEHIND THE MESSAGE</p>
            <h2>
              THE STRUGGLE WAS REAL.
              <span> SO WAS THE CALLING.</span>
            </h2>
            <p className="story-section__lead">
              Caleb speaks honestly about fatherlessness, weight loss, personal
              battles, identity, and the seasons that tested his faith and
              purpose.
            </p>
            <p>
              Faith, surrender, discipline, and the work of becoming whole
              reshaped his understanding of strength and joy. Now, he uses that
              lived experience to help people recognize that struggle does not
              have to be the final word in their story.
            </p>
            <blockquote>
              “Pain can shape you without getting the final say over who you
              become.”
            </blockquote>
            <LinkButton href="/about" variant="text">
              Read Caleb’s Story
            </LinkButton>
          </Reveal>
        </div>
      </section>

      <section className="audience-section" id="audiences">
        <div className="container">
          <SectionHeading
            body="One message. Four rooms. Each experience begins with the people in front of Caleb and the purpose that brought them together."
            eyebrow="WHO CALEB SERVES"
            title="THE STAGE CHANGES. THE PURPOSE DOESN’T."
          />
          <div className="audience-grid">
            {audiencePaths.map((item, index) => (
              <Reveal
                className={`audience-card audience-card--${index + 1}`}
                delay={index * 0.06}
                key={item.id}
              >
                <span className="audience-card__number">
                  0{index + 1}
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link href={item.href}>
                  Explore this audience <span aria-hidden="true">↗</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="reel-section" id="speaker-reel">
        <div className="container reel-section__heading">
          <p className="eyebrow">WATCH CALEB SPEAK</p>
          <h2>THE MESSAGE IS MEANT TO BE FELT.</h2>
          <p>
            Hear the energy, conviction, and humanity Caleb brings to the room.
          </p>
        </div>
        <Reveal className="reel-section__frame">
          <AccessibleVideo />
        </Reveal>
      </section>

      <section className="topics-section" id="topics">
        <div className="container">
          <SectionHeading
            body={topicPromise}
            eyebrow="SIGNATURE MESSAGES"
            title="WORDS THAT MOVE WITH YOU."
          />
          <div className="topic-grid">
            {speakingTopics.map((topic, index) => (
              <Reveal className="topic-card" delay={(index % 4) * 0.04} key={topic}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{topic}</h3>
                <p>
                  A purpose-centered message shaped around the audience, event
                  setting, and desired emphasis.
                </p>
                <Link href="/speaking" aria-label={`Explore ${topic}`}>
                  <span aria-hidden="true">↗</span>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="section-action">
            <LinkButton href="/speaking">Explore Speaking Topics</LinkButton>
          </div>
        </div>
      </section>

      <section className="outcomes-section">
        <div className="container outcomes-section__grid">
          <Reveal>
            <p className="eyebrow">WHAT ORGANIZERS CAN EXPECT</p>
            <h2>A MESSAGE BUILT FOR THE ROOM — NOT PULLED FROM A SHELF.</h2>
          </Reveal>
          <div className="outcomes-list">
            {organizerOutcomes.map((outcome, index) => (
              <Reveal className="outcome-row" delay={index * 0.05} key={outcome}>
                <span>0{index + 1}</span>
                <p>{outcome}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="book-section">
        <div className="container book-section__grid">
          <Reveal className="book-section__visual">
            <div className="book-glow" />
            <Image
              alt={`Cover of ${book.title}`}
              height={750}
              sizes="(max-width: 767px) 62vw, 30vw"
              src={withBasePath(book.cover)}
              width={500}
            />
            <span className="book-section__caption">THE WEIGHTY JOY OF SURRENDER</span>
          </Reveal>
          <Reveal className="book-section__copy" delay={0.08}>
            <p className="eyebrow">THE BOOK</p>
            <h2>SHEDDING POUNDS, GAINING PURPOSE.</h2>
            <p className="serif-lead">{book.title}</p>
            <p>{book.body}</p>
            <div className="button-row">
              <LinkButton href={book.purchaseUrl}>Buy the Book</LinkButton>
              <LinkButton href="/book-media" variant="outline">
                Book & Media
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="formats-section">
        <div className="container">
          <SectionHeading
            body="From a focused keynote to an extended workshop, the format is discussed around the audience and the organizer’s goals."
            eyebrow="ENGAGEMENT FORMATS"
            title="CHOOSE THE SHAPE. BUILD THE EXPERIENCE."
          />
          <div className="format-list">
            {engagementFormats.map((format, index) => (
              <Reveal className="format-row" key={format.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{format.title}</h3>
                <p>{format.description}</p>
                <Link href="/book-caleb" aria-label={`Inquire about ${format.title}`}>
                  ↗
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section">
        <div className="container">
          <SectionHeading
            eyebrow="THE BOOKING PROCESS"
            title="FROM INQUIRY TO IMPACT."
            align="center"
          />
          <div className="process-grid">
            {bookingProcess.map((step, index) => (
              <Reveal className="process-card" delay={index * 0.08} key={step.title}>
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </Reveal>
            ))}
          </div>
          <CableLine />
        </div>
      </section>

      <section className="faq-preview">
        <div className="container faq-preview__grid">
          <SectionHeading
            eyebrow="BEFORE YOU INQUIRE"
            title="CLEAR ANSWERS FOR EVENT PLANNERS."
          />
          <div>
            <FaqList items={faqs.slice(0, 5)} />
            <LinkButton href="/faq" variant="text">
              View All Questions
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="booking-bridge">
        <div className="container booking-bridge__grid">
          <Reveal>
            <p className="eyebrow">START THE CONVERSATION</p>
            <h2>TELL US ABOUT THE ROOM YOU’RE BUILDING.</h2>
          </Reveal>
          <Reveal className="booking-bridge__form" delay={0.08}>
            <BookingForm variant="compact" />
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
