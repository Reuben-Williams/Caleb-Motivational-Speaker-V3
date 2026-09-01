import { describe, expect, it } from "vitest";

import {
  evidenceRegistry,
  faqs,
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
});
