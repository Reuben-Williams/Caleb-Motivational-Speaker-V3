import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FaqList } from "@/components/faq-list";
import { SiteHeader } from "@/components/site-header";
import { faqs } from "@/content/site";

describe("SiteHeader", () => {
  it("opens and closes the audience menu with keyboard-accessible controls", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const trigger = screen.getByRole("button", { name: "Audiences" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: "Schools & Colleges" }),
    ).toBeVisible();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("exposes the primary booking action", () => {
    render(<SiteHeader />);
    expect(
      screen.getAllByRole("link", { name: "Book Caleb" }).length,
    ).toBeGreaterThan(0);
  });

  it("exposes the original color scheme control in both responsive headers", () => {
    render(<SiteHeader />);

    expect(
      screen.getAllByRole("button", {
        name: "Original colors",
        hidden: true,
      }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: "Book Caleb" }).length,
    ).toBeGreaterThan(0);
  });

  it("keeps mobile-menu scrolling independent from Lenis", () => {
    render(<SiteHeader />);

    expect(document.getElementById("mobile-navigation")).toHaveAttribute(
      "data-lenis-prevent",
    );
  });

  it("marks the header compact after the page scrolls", () => {
    render(<SiteHeader />);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 180,
    });
    fireEvent.scroll(window);

    expect(screen.getByRole("banner")).toHaveAttribute(
      "data-scrolled",
      "true",
    );
  });
});

describe("FaqList", () => {
  it("reveals and collapses an answer from a semantic button", async () => {
    const user = userEvent.setup();
    render(<FaqList items={faqs.slice(0, 2)} />);

    const trigger = screen.getByRole("button", {
      name: "What audiences does Caleb speak to?",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/schools and colleges, churches and faith communities/),
    ).toBeVisible();
  });
});
