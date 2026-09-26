import { readFileSync } from "node:fs";
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
it("loads the staff document fully so the editor CSP is applied", () => {
  const source = readFileSync("src/components/site-footer.tsx", "utf8");
  expect(source).toContain('<a href="/admin/editor">Staff Login</a>');
  expect(source).not.toContain('<Link href="/admin/editor">');
});
