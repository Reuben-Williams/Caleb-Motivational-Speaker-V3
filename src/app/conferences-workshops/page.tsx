import type { Metadata } from "next";

import { AudiencePage } from "@/components/audience-page";
import { routeCopy } from "@/content/site";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata(
  "/conferences-workshops",
);

export default function ConferencesWorkshopsPage() {
  return (
    <AudiencePage
      accent="burgundy"
      challenges={[
        "Inspiration that fades before it becomes a practice",
        "Leadership pressure disconnected from identity and character",
        "Teams or communities navigating adversity and change",
        "The need for honest, purpose-centered dialogue",
      ]}
      current="Conferences & Workshops"
      eyebrow="FOR ORGANIZATIONS AND LEADERSHIP PROGRAMS"
      formatIndexes={[0, 3, 4, 5, 6, 8]}
      image="/media/photos/caleb-speaking-wide.webp"
      imageAlt="Caleb Jakes speaking into a microphone"
      intro={routeCopy.conferences.intro}
      note={routeCopy.conferences.note}
      outcomes={[
        "A bridge between lived experience and practical reflection",
        "Language for resilience, identity, character, and purpose",
        "Room for conversation, interaction, and meaningful application",
        "A message calibrated for the organization and event goals",
      ]}
      title={routeCopy.conferences.title}
    />
  );
}

