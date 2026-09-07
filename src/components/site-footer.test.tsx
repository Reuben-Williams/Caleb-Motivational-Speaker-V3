import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
  it("links approved staff to Caleb's canonical editor entry", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Staff Login" })).toHaveAttribute(
      "href",
      "/admin/editor",
    );
    expect(
      screen.queryByRole("link", { name: /speaking engagements/i }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href="/admin/editor/speaking-engagements"]'),
    ).not.toBeInTheDocument();
  });

  it("renders the centralized Atlanta location without a stale Rochester literal", () => {
    const { container } = render(<SiteFooter />);

    expect(screen.getAllByText(/Atlanta, Georgia/)).toHaveLength(2);
    expect(container).not.toHaveTextContent(/Rochester/i);
  });
});
