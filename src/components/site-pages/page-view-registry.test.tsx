import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { StructuredData } from "@/components/structured-data";
import { HomePageView } from "@/components/site-pages/home-page-view";
import {
  CalebPageView,
  type CalebPageViewPath,
} from "@/components/site-pages/page-view-registry";
import { resolveCalebPublishedContent } from "@/lib/site-editor/content-resolution";
import { CALEB_EDITOR_SITE_CONFIG } from "@/lib/site-editor/site-config";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("Caleb shared page content contract", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    class TestIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      value: TestIntersectionObserver,
    });
  });

  it("marks declared home regions with their resolved values", () => {
    render(<HomePageView content={resolveCalebPublishedContent("/", null)} />);

    expect(screen.getByText("PAIN HAS")).toHaveAttribute(
      "data-builder-region-id",
      "home.hero.title.line1",
    );
    expect(screen.getByAltText("Caleb Jakes smiling in a navy shirt with white stripes"))
      .toHaveAttribute("data-builder-region-id", "home.hero.image");
  });

  it("lets FAQ structured data consume the same resolved questions as the visible page", () => {
    const items = [{ question: "Resolved question?", answer: "Resolved answer." }];
    const { container } = render(
      <StructuredData faq faqItems={items} />,
    );
    expect(container.querySelector("script")?.textContent).toContain("Resolved question?");
  });

  it.each(CALEB_EDITOR_SITE_CONFIG.pages)(
    "renders every declared region exactly once for $path",
    ({ path, regions }) => {
      const { container } = render(
        <CalebPageView
          content={resolveCalebPublishedContent(path, null)}
          pagePath={path as CalebPageViewPath}
        />,
      );
      for (const region of regions) {
        expect(container.querySelectorAll(`[data-builder-region-id="${region.id}"]`))
          .toHaveLength(1);
      }
      expect(container.querySelectorAll("[data-builder-region-id]")).toHaveLength(regions.length);
    },
  );
});
