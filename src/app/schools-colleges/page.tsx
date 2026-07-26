import type { Metadata } from "next";

import { AudiencePage } from "@/components/audience-page";
import { routeCopy } from "@/content/site";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("/schools-colleges");

export default function SchoolsCollegesPage() {
  return (
    <AudiencePage
      accent="cobalt"
      challenges={[
        "Pressure to perform without a grounded sense of identity",
        "Setbacks that can feel bigger than the future",
        "Disconnection between goals, discipline, and purpose",
        "The need to be seen, challenged, and encouraged honestly",
      ]}
      current="Schools & Colleges"
      eyebrow="FOR STUDENTS AND CAMPUS COMMUNITIES"
      formatIndexes={[1, 0, 4, 7]}
      image="/media/photos/caleb-speaking-mobile.webp"
      imageAlt="Caleb Jakes speaking"
      intro={routeCopy.schools.intro}
      note={routeCopy.schools.note}
      outcomes={[
        "A more practical view of resilience and growth mindset",
        "Language for connecting struggle with forward movement",
        "Reflection on identity, choices, and purpose",
        "A next step that feels possible after the applause ends",
      ]}
      title={routeCopy.schools.title}
    />
  );
}

