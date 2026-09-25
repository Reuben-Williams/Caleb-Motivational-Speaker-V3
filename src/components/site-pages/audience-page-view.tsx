import { AudiencePage } from "@/components/audience-page";
import type { CalebResolvedPageContent } from "@/components/site-content/site-page-content";
import { routeCopy } from "@/content/site";

const audiences = {
  "/schools-colleges": {
    accent: "cobalt", current: "Schools & Colleges", prefix: "schools",
    eyebrow: "FOR STUDENTS AND CAMPUS COMMUNITIES", image: "/media/photos/caleb-speaking-mobile.webp", imageAlt: "Caleb Jakes speaking", formatIndexes: [1, 0, 4, 7],
    challenges: ["Pressure to perform without a grounded sense of identity", "Setbacks that can feel bigger than the future", "Disconnection between goals, discipline, and purpose", "The need to be seen, challenged, and encouraged honestly"],
    outcomes: ["A more practical view of resilience and growth mindset", "Language for connecting struggle with forward movement", "Reflection on identity, choices, and purpose", "A next step that feels possible after the applause ends"],
  },
  "/faith-events": {
    accent: "gold", current: "Faith Events", prefix: "faith",
    eyebrow: "FOR CHURCHES AND FAITH COMMUNITIES", image: "/media/photos/caleb-book-wide-03.webp", imageAlt: "Caleb Jakes with his book", formatIndexes: [2, 0, 4, 6],
    challenges: ["Pain that has complicated identity, trust, or hope", "The tension between faith language and lived struggle", "A desire for freedom that also calls for honest surrender", "The need for encouragement grounded in real experience"],
    outcomes: ["Scripture-grounded encouragement without minimizing pain", "Reflection on faith, freedom, identity, and surrender", "An invitation to see transformation as active work", "A purpose-centered message people can continue carrying"],
  },
  "/conferences-workshops": {
    accent: "burgundy", current: "Conferences & Workshops", prefix: "conferences",
    eyebrow: "FOR ORGANIZATIONS AND LEADERSHIP PROGRAMS", image: "/media/photos/caleb-speaking-wide.webp", imageAlt: "Caleb Jakes speaking into a microphone", formatIndexes: [0, 3, 4, 5, 6, 8],
    challenges: ["Inspiration that fades before it becomes a practice", "Leadership pressure disconnected from identity and character", "Teams or communities navigating adversity and change", "The need for honest, purpose-centered dialogue"],
    outcomes: ["A bridge between lived experience and practical reflection", "Language for resilience, identity, character, and purpose", "Room for conversation, interaction, and meaningful application", "A message calibrated for the organization and event goals"],
  },
} as const;

export type CalebAudiencePath = keyof typeof audiences;

export function AudiencePageView({ content, pagePath }: Readonly<{ content: CalebResolvedPageContent; pagePath: CalebAudiencePath }>) {
  const value = audiences[pagePath];
  const copy = routeCopy[value.prefix];
  return <AudiencePage {...value} content={content} intro={copy.intro} note={copy.note} outcomes={[...value.outcomes]} challenges={[...value.challenges]} formatIndexes={[...value.formatIndexes]} regionPrefix={value.prefix} title={copy.title} />;
}
