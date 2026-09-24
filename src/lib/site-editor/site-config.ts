import type {
  BuilderPage,
  BuilderRegionDefinition,
  EditableValue,
} from "@reuben-williams/core";

import {
  book,
  faqs,
  hero,
  routeCopy,
  topicPromise,
} from "@/content/site";

import { getCalebSeedMedia } from "./media-seed-catalog";

export const CALEB_EDITOR_MIGRATION = "0015_caleb_attached_site_editor.sql";
export const CALEB_EDITOR_SCHEMA_CONTRACT = {
  builder: 2,
  forms: 2,
  growth: 1,
} as const;

export const CALEB_EDITOR_LIMITS = {
  eyebrow: 120,
  title: 160,
  body: 600,
  quote: 300,
  faqQuestion: 220,
  faqAnswer: 1200,
  imageAlt: 240,
} as const;

type TextValue = Extract<EditableValue, { type: "text" }>;
type ImageValue = Extract<EditableValue, { type: "image" }> & {
  mediaId: string;
  alt: string;
};

interface CalebRegionPolicy {
  required: true;
  linkable: false;
  maxCodePoints: number;
}

export interface CalebTextRegionDefinition
  extends Omit<BuilderRegionDefinition, "kind" | "required">,
    CalebRegionPolicy {
  kind: "text";
  fallback: TextValue;
}

export interface CalebImageRegionDefinition
  extends Omit<BuilderRegionDefinition, "kind" | "required">,
    CalebRegionPolicy {
  kind: "image";
  fallback: ImageValue;
  seedMediaId: string;
}

export type CalebEditorRegionDefinition =
  | CalebTextRegionDefinition
  | CalebImageRegionDefinition;

export interface CalebEditorPage extends Omit<BuilderPage, "regions"> {
  regions: CalebEditorRegionDefinition[];
}

export interface CalebEditorSiteConfig {
  siteId: string;
  migration: typeof CALEB_EDITOR_MIGRATION;
  schemas: typeof CALEB_EDITOR_SCHEMA_CONTRACT;
  globalRegions: [];
  pages: CalebEditorPage[];
}

function text(
  id: string,
  label: string,
  value: string,
  maxCodePoints: number,
): CalebTextRegionDefinition {
  return {
    id,
    kind: "text",
    label,
    required: true,
    linkable: false,
    maxCodePoints,
    fallback: { type: "text", value },
  };
}

function image(
  id: string,
  label: string,
  seedMediaId: string,
): CalebImageRegionDefinition {
  const asset = getCalebSeedMedia(seedMediaId);
  if (!asset) throw new Error(`Unknown Caleb seed media: ${seedMediaId}`);
  return {
    id,
    kind: "image",
    label,
    required: true,
    linkable: false,
    maxCodePoints: CALEB_EDITOR_LIMITS.imageAlt,
    seedMediaId,
    fallback: {
      type: "image",
      mediaId: asset.id,
      src: asset.path,
      alt: asset.alt,
    },
  };
}

const eyebrow = (id: string, label: string, value: string) =>
  text(id, label, value, CALEB_EDITOR_LIMITS.eyebrow);
const title = (id: string, label: string, value: string) =>
  text(id, label, value, CALEB_EDITOR_LIMITS.title);
const body = (id: string, label: string, value: string) =>
  text(id, label, value, CALEB_EDITOR_LIMITS.body);
const quote = (id: string, label: string, value: string) =>
  text(id, label, value, CALEB_EDITOR_LIMITS.quote);

const faqKeys = [
  "audiences",
  "secular",
  "faith-adjustment",
  "international",
  "formats",
  "keynote-workshop",
  "timing",
  "quote-information",
  "panels-podcasts",
  "travel",
  "media-kit",
] as const;

const faqRegions: CalebTextRegionDefinition[] = faqKeys.flatMap((key, index) => {
  const item = faqs[index];
  return [
    text(
      `faq.item.${key}.question`,
      `FAQ ${index + 1} question`,
      item.question,
      CALEB_EDITOR_LIMITS.faqQuestion,
    ),
    text(
      `faq.item.${key}.answer`,
      `FAQ ${index + 1} answer`,
      item.answer,
      CALEB_EDITOR_LIMITS.faqAnswer,
    ),
  ];
});

export const CALEB_EDITOR_SITE_CONFIG = {
  siteId: "ce607bf6-2959-4d7e-b52a-31a8d21b1db2",
  migration: CALEB_EDITOR_MIGRATION,
  schemas: CALEB_EDITOR_SCHEMA_CONTRACT,
  globalRegions: [],
  pages: [
    {
      path: "/",
      label: "Home",
      regions: [
        eyebrow("home.hero.eyebrow", "Hero eyebrow", hero.eyebrow),
        title("home.hero.title.line1", "Hero title", "PAIN HAS"),
        title("home.hero.title.emphasis", "Hero emphasized title", "PURPOSE."),
        body("home.hero.body", "Hero introduction", hero.body),
        body("home.hero.credential", "Hero credentials", hero.credential),
        body("home.hero.location", "Hero location", hero.location),
        image("home.hero.image", "Hero image", "seed-home-hero-cutout-v1"),
        image("home.story.image.primary", "Story primary image", "seed-home-story-primary-v1"),
        image("home.story.image.secondary", "Story secondary image", "seed-home-story-secondary-v1"),
        eyebrow("home.story.eyebrow", "Story eyebrow", "THE STORY BEHIND THE MESSAGE"),
        title("home.story.title.line1", "Story title", "THE STRUGGLE WAS REAL."),
        title("home.story.title.emphasis", "Story emphasized title", "SO WAS THE CALLING."),
        body(
          "home.story.lead",
          "Story lead",
          "Caleb speaks honestly about fatherlessness, weight loss, personal battles, identity, and the seasons that tested his faith and purpose.",
        ),
        body(
          "home.story.body",
          "Story body",
          "Faith, surrender, discipline, and the work of becoming whole reshaped his understanding of strength and joy. Now, he uses that lived experience to help people recognize that struggle does not have to be the final word in their story.",
        ),
        quote(
          "home.story.quote",
          "Story quote",
          "“Pain can shape you without getting the final say over who you become.”",
        ),
        eyebrow("home.reel.eyebrow", "Speaker reel eyebrow", "WATCH CALEB SPEAK"),
        title("home.reel.title", "Speaker reel title", "THE MESSAGE IS MEANT TO BE FELT."),
        body(
          "home.reel.body",
          "Speaker reel description",
          "Hear the energy, conviction, and humanity Caleb brings to the room.",
        ),
        image("home.book.cover", "Book cover", "seed-book-cover-v1"),
        eyebrow("home.book.eyebrow", "Book eyebrow", "THE BOOK"),
        title("home.book.heading", "Book heading", "SHEDDING POUNDS, GAINING PURPOSE."),
        title("home.book.title", "Book title", book.title),
        body("home.book.body", "Book description", book.body),
      ],
    },
    {
      path: "/about",
      label: "About Caleb",
      regions: [
        eyebrow("about.hero.eyebrow", "Hero eyebrow", "MEET CALEB JAKES"),
        title("about.hero.title", "Hero title", routeCopy.about.title),
        body("about.hero.intro", "Hero introduction", routeCopy.about.intro),
        image("about.hero.image", "Hero image", "seed-about-hero-v1"),
        title("about.chapter.struggle.title", "Struggle chapter title", routeCopy.about.chapters[0].title),
        body("about.chapter.struggle.body", "Struggle chapter body", routeCopy.about.chapters[0].body),
        title("about.chapter.transformation.title", "Transformation chapter title", routeCopy.about.chapters[1].title),
        body("about.chapter.transformation.body", "Transformation chapter body", routeCopy.about.chapters[1].body),
        title("about.chapter.calling.title", "Calling chapter title", routeCopy.about.chapters[2].title),
        body("about.chapter.calling.body", "Calling chapter body", routeCopy.about.chapters[2].body),
        title("about.chapter.mission.title", "Mission chapter title", routeCopy.about.chapters[3].title),
        body("about.chapter.mission.body", "Mission chapter body", routeCopy.about.chapters[3].body),
        image("about.collage.image", "Story image", "seed-about-collage-v1"),
        eyebrow("about.collage.eyebrow", "Story eyebrow", "JOYIONAIRE™"),
        title("about.collage.title", "Story title", "A DIFFERENT PICTURE OF WEALTH."),
        body(
          "about.collage.body",
          "Story body",
          "Joyionaire™ Enterprises is built around being rich in joy, faith, character, purpose, and the strength to keep standing when life becomes heavy.",
        ),
        quote(
          "about.collage.quote",
          "Story quote",
          "“The goal is not to deny the weight. It is to discover what can be built through surrender, resilience, and purpose.”",
        ),
      ],
    },
    {
      path: "/speaking",
      label: "Speaking",
      regions: [
        eyebrow("speaking.hero.eyebrow", "Hero eyebrow", "KEYNOTES · WORKSHOPS · CONVERSATIONS"),
        title("speaking.hero.title", "Hero title", routeCopy.speaking.title),
        body("speaking.hero.intro", "Hero introduction", routeCopy.speaking.intro),
        image("speaking.hero.image", "Hero image", "seed-speaking-hero-v1"),
        eyebrow("speaking.messages.eyebrow", "Messages eyebrow", "SIGNATURE MESSAGES"),
        title("speaking.messages.title", "Messages title", "SUBJECTS THAT OPEN A DOOR TO PURPOSE."),
        body("speaking.messages.body", "Messages body", topicPromise),
        body("speaking.messages.note", "Messages note", routeCopy.speaking.note),
      ],
    },
    {
      path: "/schools-colleges",
      label: "Schools & Colleges",
      regions: [
        eyebrow("schools.hero.eyebrow", "Hero eyebrow", "FOR STUDENTS AND CAMPUS COMMUNITIES"),
        title("schools.hero.title", "Hero title", routeCopy.schools.title),
        body("schools.hero.intro", "Hero introduction", routeCopy.schools.intro),
        image("schools.hero.image", "Hero image", "seed-schools-hero-v1"),
        body("schools.audience.note", "Audience note", routeCopy.schools.note),
      ],
    },
    {
      path: "/faith-events",
      label: "Faith Events",
      regions: [
        eyebrow("faith.hero.eyebrow", "Hero eyebrow", "FOR CHURCHES AND FAITH COMMUNITIES"),
        title("faith.hero.title", "Hero title", routeCopy.faith.title),
        body("faith.hero.intro", "Hero introduction", routeCopy.faith.intro),
        image("faith.hero.image", "Hero image", "seed-faith-hero-v1"),
        body("faith.audience.note", "Audience note", routeCopy.faith.note),
      ],
    },
    {
      path: "/conferences-workshops",
      label: "Conferences & Workshops",
      regions: [
        eyebrow("conferences.hero.eyebrow", "Hero eyebrow", "FOR ORGANIZATIONS AND LEADERSHIP PROGRAMS"),
        title("conferences.hero.title", "Hero title", routeCopy.conferences.title),
        body("conferences.hero.intro", "Hero introduction", routeCopy.conferences.intro),
        image("conferences.hero.image", "Hero image", "seed-conferences-hero-v1"),
        body("conferences.audience.note", "Audience note", routeCopy.conferences.note),
      ],
    },
    {
      path: "/book-media",
      label: "Book & Media",
      regions: [
        eyebrow("bookMedia.hero.eyebrow", "Hero eyebrow", "AUTHOR · SPEAKER · CONVERSATION PARTNER"),
        title("bookMedia.hero.title", "Hero title", routeCopy.bookMedia.title),
        body("bookMedia.hero.intro", "Hero introduction", routeCopy.bookMedia.intro),
        image("bookMedia.hero.image", "Hero image", "seed-book-media-hero-v1"),
        image("bookMedia.book.cover", "Book cover", "seed-book-cover-v1"),
        eyebrow("bookMedia.book.eyebrow", "Book eyebrow", "THE BOOK"),
        title("bookMedia.book.title", "Book title", book.title),
        body(
          "bookMedia.book.lead",
          "Book lead",
          "A story of transformation, faith, surrender, identity, and the discovery of purpose.",
        ),
        body("bookMedia.book.body", "Book description", book.body),
        eyebrow("bookMedia.reel.eyebrow", "Speaker reel eyebrow", "THE SPEAKER REEL"),
        title("bookMedia.reel.title", "Speaker reel title", "SEE THE MESSAGE IN MOTION."),
        body(
          "bookMedia.reel.body",
          "Speaker reel description",
          "Approved footage offers a direct look at Caleb’s delivery and message. Captions and a text transcript are available.",
        ),
        eyebrow("bookMedia.inquiry.eyebrow", "Media inquiry eyebrow", "PODCASTS · PANELS · INTERVIEWS"),
        title("bookMedia.inquiry.title", "Media inquiry title", "BRING CALEB INTO THE CONVERSATION."),
        body(
          "bookMedia.inquiry.body",
          "Media inquiry body",
          "Caleb is available for conversations about faith, identity, resilience, transformation, purpose, and the story behind the book. Share the program, format, audience, and desired topics in the inquiry.",
        ),
      ],
    },
    {
      path: "/faq",
      label: "FAQ",
      regions: [
        eyebrow("faq.hero.eyebrow", "Hero eyebrow", "FOR EVENT PLANNERS"),
        title("faq.hero.title", "Hero title", routeCopy.faq.title),
        body("faq.hero.intro", "Hero introduction", routeCopy.faq.intro),
        image("faq.hero.image", "Hero image", "seed-faq-hero-v1"),
        ...faqRegions,
      ],
    },
    {
      path: "/book-caleb",
      label: "Book Caleb",
      regions: [
        eyebrow("bookCaleb.intro.eyebrow", "Inquiry eyebrow", "SPEAKING INQUIRY"),
        title("bookCaleb.intro.title", "Inquiry title", routeCopy.booking.title),
        body("bookCaleb.intro.body", "Inquiry introduction", routeCopy.booking.intro),
      ],
    },
    {
      path: "/privacy",
      label: "Privacy Policy",
      regions: [],
    },
    {
      path: "/thank-you",
      label: "Thank You",
      regions: [
        eyebrow("thankYou.empty.eyebrow", "No-receipt eyebrow", "SPEAKING INQUIRY"),
        title("thankYou.empty.title", "No-receipt title", "READY TO START THE CONVERSATION?"),
        body(
          "thankYou.empty.body",
          "No-receipt introduction",
          "No accepted inquiry is associated with this page.",
        ),
      ],
    },
  ],
} satisfies CalebEditorSiteConfig;

export function findCalebEditorRegion(
  path: string,
  regionId: string,
): CalebEditorRegionDefinition | undefined {
  return CALEB_EDITOR_SITE_CONFIG.pages
    .find((page) => page.path === path)
    ?.regions.find((region) => region.id === regionId);
}
