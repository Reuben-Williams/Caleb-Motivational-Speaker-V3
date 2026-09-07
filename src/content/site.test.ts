import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  contact,
  evidenceRegistry,
  faqs,
  hero,
  navigation,
  privacyDisclosure,
  routeMetadata,
  siteFacts,
} from "@/content/site";

const requiredRoutes = [
  "/",
  "/about",
  "/speaking",
  "/schools-colleges",
  "/faith-events",
  "/conferences-workshops",
  "/book-media",
  "/faq",
  "/book-caleb",
  "/privacy",
  "/thank-you",
];

describe("approved site content", () => {
  it("defines metadata for every approved route with unique titles", () => {
    expect(Object.keys(routeMetadata).sort()).toEqual(
      [...requiredRoutes].sort(),
    );
    expect(new Set(Object.values(routeMetadata).map(({ title }) => title)).size)
      .toBe(requiredRoutes.length);
  });

  it("keeps every factual site record attached to frozen evidence", () => {
    for (const fact of siteFacts) {
      expect(fact.evidenceIds.length).toBeGreaterThan(0);
      for (const evidenceId of fact.evidenceIds) {
        expect(evidenceRegistry[evidenceId]).toBeDefined();
      }
    }
  });

  it("uses only the approved global navigation destinations", () => {
    expect(navigation.map(({ href }) => href)).toEqual([
      "/",
      "/about",
      "/speaking",
      "/book-media",
      "/faq",
      "/book-caleb",
    ]);
  });

  it("publishes the eleven frozen FAQ entries verbatim", () => {
    expect(faqs).toHaveLength(11);
    expect(faqs[0]?.question).toBe("What audiences does Caleb speak to?");
    expect(faqs.at(-1)?.question).toBe(
      "Is a speaker one-sheet or media kit available?",
    );
  });

  it("accurately discloses native inquiry storage and retention", () => {
    expect(privacyDisclosure).toMatch(/website database/i);
    expect(privacyDisclosure).toMatch(/400 days/i);
    expect(privacyDisclosure).toMatch(/Cloudflare Turnstile/i);
    expect(privacyDisclosure).toMatch(/Resend/i);
    expect(privacyDisclosure).not.toMatch(/does not store the complete inquiry/i);
    expect(privacyDisclosure).not.toMatch(/customer relationship management/i);
  });

  it("uses the approved Atlanta base location in current public content", () => {
    expect(contact.location).toBe("Atlanta, Georgia");
    expect(hero.location).toBe(
      "Based in Atlanta, GA • Available for engagements worldwide",
    );
    expect(JSON.stringify({ contact, hero })).not.toMatch(/Rochester/i);
  });

  it("keeps the Atlanta correction additive to historical evidence", () => {
    const correction = readFileSync(
      join(
        process.cwd(),
        "docs/evidence/atlanta-location-correction-2026-09-02.md",
      ),
      "utf8",
    );
    const historicalEvidence = readFileSync(
      join(process.cwd(), "src/content/evidence.ts"),
      "utf8",
    );
    const reelTranscript = readFileSync(
      join(
        process.cwd(),
        "public/media/video/caleb-speaker-reel-transcript.txt",
      ),
      "utf8",
    );
    const bookingSchema = readFileSync(
      join(process.cwd(), "src/lib/booking-schema.ts"),
      "utf8",
    );

    expect(correction).toContain("direct project-owner instruction");
    expect(correction).not.toMatch(/E02.*Atlanta|Atlanta.*E02/i);
    expect(historicalEvidence).toContain('"Rochester base"');
    expect(reelTranscript).toContain("University of Rochester");
    expect(bookingSchema).toContain('timeZone: "America/New_York"');
  });
});
