import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StructuredData } from "@/components/structured-data";

describe("StructuredData", () => {
  it("publishes Atlanta as Caleb's current home location", () => {
    const { container } = render(<StructuredData />);
    const script = container.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    const document = JSON.parse(script?.textContent ?? "{}");
    const person = document["@graph"]?.find(
      (entry: { "@type"?: string }) => entry["@type"] === "Person",
    );

    expect(person?.homeLocation?.name).toBe("Atlanta, Georgia");
    expect(script?.textContent).not.toMatch(/Rochester/i);
  });
});
