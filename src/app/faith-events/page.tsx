import type { Metadata } from "next";

import { AudiencePage } from "@/components/audience-page";
import { routeCopy } from "@/content/site";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/faith-events");

export default function FaithEventsPage() {
  return (
    <AudiencePage
      accent="gold"
      challenges={[
        "Pain that has complicated identity, trust, or hope",
        "The tension between faith language and lived struggle",
        "A desire for freedom that also calls for honest surrender",
        "The need for encouragement grounded in real experience",
      ]}
      current="Faith Events"
      eyebrow="FOR CHURCHES AND FAITH COMMUNITIES"
      formatIndexes={[2, 0, 4, 6]}
      image="/media/photos/caleb-book-wide-03.webp"
      imageAlt="Caleb Jakes with his book"
      intro={routeCopy.faith.intro}
      note={routeCopy.faith.note}
      outcomes={[
        "Scripture-grounded encouragement without minimizing pain",
        "Reflection on faith, freedom, identity, and surrender",
        "An invitation to see transformation as active work",
        "A purpose-centered message people can continue carrying",
      ]}
      title={routeCopy.faith.title}
    />
  );
}

