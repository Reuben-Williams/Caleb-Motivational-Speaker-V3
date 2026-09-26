import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CalebPageView } from "./page-view-registry";
import { resolveCalebPublishedContent } from "@/lib/site-editor/content-resolution";
import { engagementFormats, organizerOutcomes } from "@/content/site";

describe("Caleb's approved education-page document", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
    class TestIntersectionObserver { observe() {} unobserve() {} disconnect() {} }
    Object.defineProperty(globalThis, "IntersectionObserver", { configurable: true, value: TestIntersectionObserver });
  });
  it("applies all requested sections and preserves the original format descriptions and booking routes", () => {
    const { container } = render(<CalebPageView pagePath="/schools-colleges" content={resolveCalebPublishedContent("/schools-colleges", null)} />);
    expect(screen.getByText("THE I RENOUNCE MOVEMENT · FOR STUDENTS AND CAMPUS COMMUNITIES")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "HELP STUDENTS TURN PRESSURE INTO PURPOSE." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "BRING I RENOUNCE TO YOUR SCHOOL" })).toHaveAttribute("href", "/book-caleb");
    expect(screen.getByText("IDENTIFY → RENOUNCE → REPLACE")).toBeInTheDocument();
    expect(screen.getByText("THE BEHAVIOR MAY BE VISIBLE. THE BELIEF BENEATH IT OFTEN ISN’T.")).toBeInTheDocument();
    for (const copy of [
      "The I Renounce Movement helps students identify the limiting beliefs",
      "Every school sees the behaviors. Disengagement.",
      "I Renounce goes beneath the behavior",
      "Beliefs formed through rejection, failure, comparison",
      "Pressure to perform while privately believing, “I’m not enough,”",
      "Labels they have accepted about their intelligence",
      "Behaviors and choices being influenced by deeper beliefs",
      "Recognition of the difference between what happened to them",
      "Language for identifying the beliefs and internal agreements",
      "An opportunity to intentionally renounce limiting narratives",
      "A practical next step that connects a new belief",
      "The experience begins with what your community is actually facing.",
      "Students are invited to participate, reflect, and recognize—not simply",
      "Renunciation is paired with replacement and action.",
      "The core message can be calibrated for secular, private, college",
      "Bring Caleb Jakes and the I Renounce Movement to your school",
    ]) expect(container.textContent).toContain(copy);
    expect(screen.getByText("THE I RENOUNCE APPROACH")).toBeInTheDocument();
    // The numbered-card CSS styles spans as small labels, so body copy must stay a paragraph.
    expect(container.querySelectorAll(".shared-outcomes__item p span")).toHaveLength(0);
    expect(screen.getByText("BUILT AROUND THE ROOM")).toBeInTheDocument();
    expect(screen.getByText("What the audience may be carrying")).toBeInTheDocument();
    expect(screen.getByText("What the experience can invite")).toBeInTheDocument();
    expect(screen.getByText("AN EXPERIENCE THAT FITS THE MOMENT.")).toBeInTheDocument();
    for (const index of [1, 0, 4, 7]) {
      expect(screen.getByText(engagementFormats[index].title)).toBeInTheDocument();
      expect(screen.getByText(engagementFormats[index].description)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Discuss Your Event" })).toHaveAttribute("href", "/book-caleb");
    expect(screen.getByRole("link", { name: "Book Caleb" })).toHaveAttribute("href", "/book-caleb");
    expect(screen.getByText("WHAT ORGANIZERS CAN EXPECT.")).toBeInTheDocument();
    expect(screen.getByText("BRING THE MESSAGE HOME")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Caleb brings a practical message about resilience");
    expect(container.textContent).not.toContain("Use the inquiry to describe the age group");
  });

  it.each(["/faith-events", "/conferences-workshops"] as const)("does not change other audience pages: %s", (pagePath) => {
    const { container } = render(<CalebPageView pagePath={pagePath} content={resolveCalebPublishedContent(pagePath, null)} />);
    expect(container.textContent).not.toContain("I Renounce");
    expect(screen.getByText("PAIN → PURPOSE")).toBeInTheDocument();
    expect(screen.getByText("THE CHALLENGE IS PERSONAL. THE PATH FORWARD CAN BE SHARED.")).toBeInTheDocument();
    for (const item of organizerOutcomes.slice(0, 4)) expect(screen.getByText(item)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Book Caleb" })).toHaveLength(2);
  });
});
