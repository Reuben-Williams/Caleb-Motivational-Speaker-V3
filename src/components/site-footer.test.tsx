import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
  it("links approved staff to Caleb's protected login route", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Staff Login" })).toHaveAttribute(
      "href",
      "/admin/login",
    );
    expect(
      screen.queryByRole("link", { name: /speaking engagements/i }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href="/admin/editor/speaking-engagements"]'),
    ).not.toBeInTheDocument();
  });
});
